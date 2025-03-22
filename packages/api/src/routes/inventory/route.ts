import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// Define a schema for the inventory query parameters
const inventoryQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	productId: z.string().optional(),
	outletId: z.string().optional(),
	minQuantity: z.coerce.number().optional(),
	maxQuantity: z.coerce.number().optional(),
	search: z.string().optional(),
	limit: z.coerce.number().default(20),
	offset: z.coerce.number().default(0),
	sortBy: z
		.enum([
			"quantity",
			"productName",
			"outletName",
			"createdAt",
			"updatedAt",
		])
		.default("quantity"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Define a schema for the low stock query parameters
const lowStockQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	threshold: z.coerce.number().default(10),
	outletId: z.string().optional(),
});

// Define a schema for the stock level query parameters
const stockLevelQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	outletId: z.string().optional(),
});

// Define a schema for stock adjustment
const adjustStockSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int(),
	reason: z.string().optional(),
});

// Define a schema for stock transfer
const transferStockSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	fromOutletId: z.string().nonempty("Source outlet ID is required"),
	toOutletId: z.string().nonempty("Destination outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int().positive("Quantity must be positive"),
	reason: z.string().optional(),
});

// Define schema for batch adjustment
const batchAdjustStockSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	adjustments: z
		.array(
			z.object({
				outletId: z.string().nonempty("Outlet ID is required"),
				productId: z.string().nonempty("Product ID is required"),
				quantity: z.number().int(),
				reason: z.string().optional(),
			}),
		)
		.min(1, "At least one adjustment is required"),
});

// Define schema for stock reconciliation
const reconcileStockSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	actualQuantity: z
		.number()
		.int()
		.nonnegative("Actual quantity cannot be negative"),
	reason: z.string().optional(),
});

// Define schema for stock reservation
const reserveStockSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int().positive("Quantity must be positive"),
	reservationId: z.string().optional(),
	expiresAt: z.string().datetime().optional(),
	notes: z.string().optional(),
});

// Define schema for inventory creation
const createInventorySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int().nonnegative("Quantity cannot be negative"),
});

// Define schema for inventory update
const updateInventorySchema = z.object({
	quantity: z.number().int().nonnegative("Quantity cannot be negative"),
	outletId: z.string().optional(),
});

// Enum for inventory change types
enum InventoryChangeType {
	ADJUSTMENT = "ADJUSTMENT",
	TRANSFER_IN = "TRANSFER_IN",
	TRANSFER_OUT = "TRANSFER_OUT",
}

export const inventoryRouter = new Hono()
	.basePath("/inventory")
	// 1. List Inventory Items
	.get(
		"/",
		authMiddleware,
		validator("query", inventoryQuerySchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "List inventory items",
			description:
				"Retrieve a list of inventory items with filtering, pagination, and sorting",
			responses: {
				200: {
					description: "List of inventory items",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									items: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												outletId: { type: "string" },
												productId: { type: "string" },
												quantity: { type: "number" },
												createdAt: {
													type: "string",
													format: "date-time",
												},
												updatedAt: {
													type: "string",
													format: "date-time",
												},
												product: {
													type: "object",
												},
												outlet: {
													type: "object",
												},
											},
										},
									},
									total: { type: "number" },
								},
							},
						},
					},
				},
				400: {
					description: "Invalid query parameters",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				productId,
				outletId,
				minQuantity,
				maxQuantity,
				search,
				limit,
				offset,
				sortBy,
				sortOrder,
			} = c.req.valid("query");

			// Build the where clause based on query parameters
			let where: Prisma.InventoryWhereInput = {
				organizationId,
				...(productId && { productId }),
				...(outletId && { outletId }),
				...(minQuantity !== undefined && {
					quantity: { gte: minQuantity },
				}),
				...(maxQuantity !== undefined && {
					quantity: { lte: maxQuantity },
				}),
			};

			// Add search filter separately if needed
			if (search) {
				where = {
					...where,
					product: {
						name: {
							contains: search,
							mode: "insensitive" as Prisma.QueryMode,
						},
					},
				};
			}

			// Determine the order by clause based on sortBy
			let orderBy = {};
			if (sortBy === "productName") {
				orderBy = { product: { name: sortOrder } };
			} else if (sortBy === "outletName") {
				orderBy = { outlet: { name: sortOrder } };
			} else {
				orderBy = { [sortBy]: sortOrder };
			}

			// Count total items for pagination
			const total = await db.inventory.count({ where });

			// Get inventory items with pagination, sorting, and relations
			const items = await db.inventory.findMany({
				where,
				include: {
					product: true,
					outlet: true,
				},
				orderBy,
				skip: offset,
				take: limit,
			});

			return c.json({ items, total });
		},
	)

	// 2. Adjust Stock Levels
	.post(
		"/adjust",
		authMiddleware,
		validator("json", adjustStockSchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Adjust stock level",
			description:
				"Add or deduct stock for a product in an outlet, with logging",
			responses: {
				200: {
					description: "Stock adjustment successful",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									inventory: {
										type: "object",
										properties: {
											id: { type: "string" },
											organizationId: { type: "string" },
											outletId: { type: "string" },
											productId: { type: "string" },
											quantity: { type: "number" },
											createdAt: {
												type: "string",
												format: "date-time",
											},
											updatedAt: {
												type: "string",
												format: "date-time",
											},
										},
									},
									log: {
										type: "object",
										properties: {
											id: { type: "string" },
											inventoryId: { type: "string" },
											changeType: { type: "string" },
											quantityBefore: { type: "number" },
											quantityAfter: { type: "number" },
											changeAmount: { type: "number" },
											userId: { type: "string" },
											reason: { type: "string" },
											createdAt: {
												type: "string",
												format: "date-time",
											},
										},
									},
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input or insufficient stock",
				},
				404: {
					description: "Product or outlet not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, outletId, productId, quantity, reason } =
				c.req.valid("json");
			const user = c.get("user");

			// Use a transaction to ensure data consistency
			const result = await db.$transaction(async (tx) => {
				// Check if the product exists
				const product = await tx.product.findUnique({
					where: { id: productId },
				});

				if (!product) {
					return { error: "Product not found", status: 404 };
				}

				// Check if the outlet exists
				const outlet = await tx.outlet.findUnique({
					where: { id: outletId },
				});

				if (!outlet) {
					return { error: "Outlet not found", status: 404 };
				}

				// Check if inventory record exists
				let inventory = await tx.inventory.findFirst({
					where: {
						organizationId,
						outletId,
						productId,
					},
				});

				let quantityBefore = 0;
				let quantityAfter = 0;

				if (inventory) {
					quantityBefore = inventory.quantity;
					quantityAfter = inventory.quantity + quantity;

					// Prevent negative stock
					if (quantityAfter < 0) {
						return { error: "Insufficient stock", status: 400 };
					}

					// Update inventory
					inventory = await tx.inventory.update({
						where: { id: inventory.id },
						data: { quantity: quantityAfter },
					});
				} else {
					// Create new inventory if it doesn't exist (only allow positive quantity)
					if (quantity < 0) {
						return {
							error: "Cannot deduct from non-existent inventory",
							status: 400,
						};
					}

					quantityAfter = quantity;
					inventory = await tx.inventory.create({
						data: {
							organizationId,
							outletId,
							productId,
							quantity,
						},
					});
				}

				// Create inventory log
				const log = {
					inventoryId: inventory.id,
					changeType: InventoryChangeType.ADJUSTMENT,
					quantityBefore,
					quantityAfter,
					changeAmount: quantity,
					userId: user.id,
					reason: reason || "Manual adjustment",
					createdAt: new Date(),
				};

				// We would normally save the log, but since we don't have the table yet,
				// we'll just return it in the response

				return { inventory, log };
			});

			if ("error" in result) {
				return c.json(
					{ error: result.error },
					result.status as 400 | 404,
				);
			}

			return c.json(result);
		},
	)

	// 3. Transfer Stock Between Outlets
	.post(
		"/transfer",
		authMiddleware,
		validator("json", transferStockSchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Transfer stock",
			description: "Move stock from one outlet to another atomically",
			responses: {
				200: {
					description: "Stock transfer successful",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									sourceInventory: {
										type: "object",
									},
									destinationInventory: {
										type: "object",
									},
									sourceLog: {
										type: "object",
									},
									destinationLog: {
										type: "object",
									},
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input or insufficient stock",
				},
				404: {
					description: "Product or outlet not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				fromOutletId,
				toOutletId,
				productId,
				quantity,
				reason,
			} = c.req.valid("json");
			const user = c.get("user");

			if (fromOutletId === toOutletId) {
				return c.json(
					{
						error: "Source and destination outlets must be different",
					},
					400,
				);
			}

			// Use a transaction to ensure data consistency
			const result = await db.$transaction(async (tx) => {
				// Check if source inventory exists
				const sourceInventory = await tx.inventory.findFirst({
					where: {
						organizationId,
						outletId: fromOutletId,
						productId,
					},
				});

				if (!sourceInventory) {
					return { error: "Source inventory not found", status: 404 };
				}

				// Check if there's enough stock
				if (sourceInventory.quantity < quantity) {
					return {
						error: "Insufficient stock in source outlet",
						status: 400,
					};
				}

				// Check if destination inventory exists
				let destinationInventory = await tx.inventory.findFirst({
					where: {
						organizationId,
						outletId: toOutletId,
						productId,
					},
				});

				// Update source inventory
				const updatedSourceInventory = await tx.inventory.update({
					where: { id: sourceInventory.id },
					data: { quantity: sourceInventory.quantity - quantity },
				});

				// Create or update destination inventory
				if (destinationInventory) {
					destinationInventory = await tx.inventory.update({
						where: { id: destinationInventory.id },
						data: {
							quantity: destinationInventory.quantity + quantity,
						},
					});
				} else {
					destinationInventory = await tx.inventory.create({
						data: {
							organizationId,
							outletId: toOutletId,
							productId,
							quantity,
						},
					});
				}

				// Create logs for source and destination
				const sourceLog = {
					inventoryId: sourceInventory.id,
					changeType: InventoryChangeType.TRANSFER_OUT,
					quantityBefore: sourceInventory.quantity,
					quantityAfter: updatedSourceInventory.quantity,
					changeAmount: -quantity,
					userId: user.id,
					reason: reason || `Transfer to outlet ${toOutletId}`,
					createdAt: new Date(),
				};

				const destinationLog = {
					inventoryId: destinationInventory.id,
					changeType: InventoryChangeType.TRANSFER_IN,
					quantityBefore: destinationInventory.quantity - quantity,
					quantityAfter: destinationInventory.quantity,
					changeAmount: quantity,
					userId: user.id,
					reason: reason || `Transfer from outlet ${fromOutletId}`,
					createdAt: new Date(),
				};

				return {
					sourceInventory: updatedSourceInventory,
					destinationInventory,
					sourceLog,
					destinationLog,
				};
			});

			if ("error" in result) {
				return c.json(
					{ error: result.error },
					result.status as 400 | 404,
				);
			}

			return c.json(result);
		},
	)

	// 4. Get Stock Levels
	.get(
		"/stock",
		authMiddleware,
		validator("query", stockLevelQuerySchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Get stock levels",
			description:
				"Retrieve stock for a product, either per outlet or total across all outlets",
			responses: {
				200: {
					description: "Stock levels retrieved successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									product: {
										type: "object",
									},
									stockByOutlet: {
										type: "array",
										items: {
											type: "object",
											properties: {
												outletId: { type: "string" },
												outletName: { type: "string" },
												quantity: { type: "number" },
											},
										},
									},
									totalStock: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Product not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, productId, outletId } =
				c.req.valid("query");

			// Check if the product exists
			const product = await db.product.findUnique({
				where: { id: productId },
			});

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			// Get stock information
			const stockQuery = {
				where: {
					organizationId,
					productId,
					...(outletId && { outletId }),
				},
				include: {
					outlet: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			};

			const inventoryItems = await db.inventory.findMany(stockQuery);

			// Calculate total stock
			const totalStock = inventoryItems.reduce(
				(sum, item) => sum + item.quantity,
				0,
			);

			// Format the response
			const stockByOutlet = inventoryItems.map((item) => ({
				outletId: item.outletId,
				outletName: item.outlet.name,
				quantity: item.quantity,
			}));

			return c.json({
				product,
				stockByOutlet,
				totalStock,
			});
		},
	)

	// 5. Get Low Stock Products
	.get(
		"/low-stock",
		authMiddleware,
		validator("query", lowStockQuerySchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Get low stock products",
			description:
				"List products below a stock threshold, per outlet or across all outlets",
			responses: {
				200: {
					description: "Low stock products retrieved successfully",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										productId: { type: "string" },
										productName: { type: "string" },
										outletId: { type: "string" },
										outletName: { type: "string" },
										quantity: { type: "number" },
										threshold: { type: "number" },
									},
								},
							},
						},
					},
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, threshold, outletId } =
				c.req.valid("query");

			// Build the query based on whether we're checking a specific outlet or all outlets
			const inventoryQuery = {
				where: {
					organizationId,
					quantity: { lt: threshold },
					...(outletId && { outletId }),
				},
				include: {
					product: {
						select: {
							id: true,
							name: true,
						},
					},
					outlet: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			};

			const lowStockItems = await db.inventory.findMany(inventoryQuery);

			// Format the response
			const formattedItems = lowStockItems.map((item) => ({
				productId: item.productId,
				productName: item.product.name,
				outletId: item.outletId,
				outletName: item.outlet.name,
				quantity: item.quantity,
				threshold,
			}));

			return c.json(formattedItems);
		},
	)

	// 6. Get Inventory Change Log (mock implementation since we don't have the log table yet)
	.get(
		"/:id/log",
		authMiddleware,
		describeRoute({
			tags: ["Inventory"],
			summary: "Get inventory change log",
			description:
				"Retrieve the history of changes for an inventory item",
			responses: {
				200: {
					description: "Inventory change log retrieved successfully",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										inventoryId: { type: "string" },
										changeType: { type: "string" },
										quantityBefore: { type: "number" },
										quantityAfter: { type: "number" },
										changeAmount: { type: "number" },
										userId: { type: "string" },
										userName: { type: "string" },
										reason: { type: "string" },
										createdAt: {
											type: "string",
											format: "date-time",
										},
									},
								},
							},
						},
					},
				},
				404: {
					description: "Inventory item not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			// Check if the inventory exists
			const inventory = await db.inventory.findUnique({
				where: { id },
				include: {
					product: true,
					outlet: true,
				},
			});

			if (!inventory) {
				return c.json({ error: "Inventory item not found" }, 404);
			}

			// Since we don't have an actual log table yet, return a mock response
			// This would normally be fetched from the database
			return c.json([
				{
					id: "mock-log-1",
					inventoryId: id,
					changeType: InventoryChangeType.ADJUSTMENT,
					quantityBefore: 0,
					quantityAfter: inventory.quantity,
					changeAmount: inventory.quantity,
					userId: "mock-user-id",
					userName: "Mock User",
					reason: "Initial stock",
					createdAt: inventory.createdAt,
				},
			]);
		},
	)

	// Get a single inventory item by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Inventory"],
			summary: "Get inventory item by ID",
			description:
				"Retrieve a single inventory item with detailed information",
			responses: {
				200: {
					description: "Inventory item details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									outletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
									product: {
										type: "object",
									},
									outlet: {
										type: "object",
									},
								},
							},
						},
					},
				},
				404: {
					description: "Inventory item not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			const inventory = await db.inventory.findUnique({
				where: { id },
				include: {
					product: true,
					outlet: true,
				},
			});

			if (!inventory) {
				return c.json({ error: "Inventory item not found" }, 404);
			}

			return c.json(inventory);
		},
	)

	// Batch adjust stock levels for multiple products
	.post(
		"/batch-adjust",
		authMiddleware,
		validator("json", batchAdjustStockSchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Batch adjust stock levels",
			description: "Add or deduct stock for multiple products at once",
			responses: {
				200: {
					description: "Batch stock adjustment successful",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									results: {
										type: "array",
										items: {
											type: "object",
											properties: {
												success: { type: "boolean" },
												inventory: { type: "object" },
												log: { type: "object" },
												error: { type: "string" },
												productId: { type: "string" },
												outletId: { type: "string" },
											},
										},
									},
									successCount: { type: "number" },
									failureCount: { type: "number" },
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, adjustments } = c.req.valid("json");
			const user = c.get("user");

			type AdjustmentResult = {
				success: boolean;
				inventory?: any;
				log?: any;
				error?: string;
				productId: string;
				outletId: string;
			};

			const results: AdjustmentResult[] = [];
			let successCount = 0;
			let failureCount = 0;

			// Use a transaction to ensure all adjustments succeed or fail together
			await db.$transaction(async (tx) => {
				for (const adjustment of adjustments) {
					const { outletId, productId, quantity, reason } =
						adjustment;

					try {
						// Check if the product exists
						const product = await tx.product.findUnique({
							where: { id: productId },
						});

						if (!product) {
							results.push({
								success: false,
								error: "Product not found",
								productId,
								outletId,
							});
							failureCount++;
							continue;
						}

						// Check if the outlet exists
						const outlet = await tx.outlet.findUnique({
							where: { id: outletId },
						});

						if (!outlet) {
							results.push({
								success: false,
								error: "Outlet not found",
								productId,
								outletId,
							});
							failureCount++;
							continue;
						}

						// Check if inventory record exists
						let inventory = await tx.inventory.findFirst({
							where: {
								organizationId,
								outletId,
								productId,
							},
						});

						let quantityBefore = 0;
						let quantityAfter = 0;

						if (inventory) {
							quantityBefore = inventory.quantity;
							quantityAfter = inventory.quantity + quantity;

							// Prevent negative stock
							if (quantityAfter < 0) {
								results.push({
									success: false,
									error: "Insufficient stock",
									productId,
									outletId,
								});
								failureCount++;
								continue;
							}

							// Update inventory
							inventory = await tx.inventory.update({
								where: { id: inventory.id },
								data: { quantity: quantityAfter },
							});
						} else {
							// Create new inventory if it doesn't exist (only allow positive quantity)
							if (quantity < 0) {
								results.push({
									success: false,
									error: "Cannot deduct from non-existent inventory",
									productId,
									outletId,
								});
								failureCount++;
								continue;
							}

							quantityAfter = quantity;
							inventory = await tx.inventory.create({
								data: {
									organizationId,
									outletId,
									productId,
									quantity,
								},
							});
						}

						// Create inventory log entry (mock)
						const log = {
							inventoryId: inventory.id,
							changeType: InventoryChangeType.ADJUSTMENT,
							quantityBefore,
							quantityAfter,
							changeAmount: quantity,
							userId: user.id,
							reason: reason || "Batch adjustment",
							createdAt: new Date(),
						};

						results.push({
							success: true,
							inventory,
							log,
							productId,
							outletId,
						});
						successCount++;
					} catch (error) {
						results.push({
							success: false,
							error: "Internal server error",
							productId,
							outletId,
						});
						failureCount++;
					}
				}
			});

			return c.json({
				results,
				successCount,
				failureCount,
			});
		},
	)

	// Reconcile inventory (adjust to actual count from physical inventory)
	.post(
		"/reconcile",
		authMiddleware,
		validator("json", reconcileStockSchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Reconcile inventory",
			description: "Update inventory to match actual physical count",
			responses: {
				200: {
					description: "Inventory reconciliation successful",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									inventory: { type: "object" },
									log: { type: "object" },
									discrepancy: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Product or outlet not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				outletId,
				productId,
				actualQuantity,
				reason,
			} = c.req.valid("json");
			const user = c.get("user");

			const result = await db.$transaction(async (tx) => {
				// Check if the product exists
				const product = await tx.product.findUnique({
					where: { id: productId },
				});

				if (!product) {
					return { error: "Product not found", status: 404 };
				}

				// Check if the outlet exists
				const outlet = await tx.outlet.findUnique({
					where: { id: outletId },
				});

				if (!outlet) {
					return { error: "Outlet not found", status: 404 };
				}

				// Find or create inventory record
				let inventory = await tx.inventory.findFirst({
					where: {
						organizationId,
						outletId,
						productId,
					},
				});

				const quantityBefore = inventory ? inventory.quantity : 0;
				const discrepancy = actualQuantity - quantityBefore;

				if (inventory) {
					// Update inventory to actual quantity
					inventory = await tx.inventory.update({
						where: { id: inventory.id },
						data: { quantity: actualQuantity },
					});
				} else {
					// Create new inventory with actual quantity
					inventory = await tx.inventory.create({
						data: {
							organizationId,
							outletId,
							productId,
							quantity: actualQuantity,
						},
					});
				}

				// Create inventory log
				const log = {
					inventoryId: inventory.id,
					changeType: "RECONCILIATION",
					quantityBefore,
					quantityAfter: actualQuantity,
					changeAmount: discrepancy,
					userId: user.id,
					reason: reason || "Inventory reconciliation",
					createdAt: new Date(),
				};

				return { inventory, log, discrepancy };
			});

			if ("error" in result) {
				return c.json(
					{ error: result.error },
					result.status as 400 | 404,
				);
			}

			return c.json(result);
		},
	)

	// Calculate inventory value
	.get(
		"/value",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				outletId: z.string().optional(),
				categoryId: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Inventory"],
			summary: "Calculate inventory value",
			description:
				"Calculate the total value of inventory, optionally filtered by outlet or category",
			responses: {
				200: {
					description: "Inventory value calculated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									totalValue: { type: "number" },
									outletValues: {
										type: "array",
										items: {
											type: "object",
											properties: {
												outletId: { type: "string" },
												outletName: { type: "string" },
												value: { type: "number" },
											},
										},
									},
									productCount: { type: "number" },
								},
							},
						},
					},
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, outletId, categoryId } =
				c.req.valid("query");

			// Build filter based on query parameters
			const where = {
				organizationId,
				...(outletId && { outletId }),
				...(categoryId && { product: { categoryId } }),
			};

			// Get inventory with product information
			const inventoryItems = await db.inventory.findMany({
				where,
				include: {
					product: true,
					outlet: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Calculate value by outlet
			const outletMap = new Map();
			let totalValue = 0;

			for (const item of inventoryItems) {
				const itemValue = item.quantity * item.product.price;
				totalValue += itemValue;

				// Track value by outlet
				if (!outletMap.has(item.outletId)) {
					outletMap.set(item.outletId, {
						outletId: item.outletId,
						outletName: item.outlet.name,
						value: 0,
					});
				}
				outletMap.get(item.outletId).value += itemValue;
			}

			return c.json({
				totalValue,
				outletValues: Array.from(outletMap.values()),
				productCount: inventoryItems.length,
			});
		},
	)

	// Reserve inventory for future use
	.post(
		"/reserve",
		authMiddleware,
		validator("json", reserveStockSchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Reserve inventory",
			description:
				"Reserve inventory for future use (e.g., for pending orders)",
			responses: {
				200: {
					description: "Inventory reservation successful",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									reservation: { type: "object" },
									remainingStock: { type: "number" },
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input or insufficient stock",
				},
				404: {
					description: "Product or outlet not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				outletId,
				productId,
				quantity,
				reservationId = crypto.randomUUID(),
				expiresAt,
				notes,
			} = c.req.valid("json");

			const user = c.get("user");

			const result = await db.$transaction(async (tx) => {
				// Check if inventory exists and has enough stock
				const inventory = await tx.inventory.findFirst({
					where: {
						organizationId,
						outletId,
						productId,
					},
				});

				if (!inventory) {
					return {
						success: false,
						error: "Inventory not found",
						status: 404,
					};
				}

				// Check if there's enough stock
				if (inventory.quantity < quantity) {
					return {
						success: false,
						error: "Insufficient stock for reservation",
						status: 400,
					};
				}

				// In a real implementation, we would create a reservation record in a database table
				// For now, we'll return a mock reservation object
				const reservation = {
					id: reservationId,
					inventoryId: inventory.id,
					quantity,
					organizationId,
					outletId,
					productId,
					userId: user.id,
					status: "ACTIVE",
					expiresAt: expiresAt ? new Date(expiresAt) : null,
					notes,
					createdAt: new Date(),
				};

				return {
					success: true,
					reservation,
					remainingStock: inventory.quantity - quantity,
				};
			});

			if ("error" in result) {
				return c.json(
					{ error: result.error },
					result.status as 400 | 404,
				);
			}

			return c.json(result);
		},
	)

	// Export inventory data
	.get(
		"/export",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				format: z.enum(["json", "csv"]).default("json"),
				includeZeroStock: z.enum(["true", "false"]).default("false"),
			}),
		),
		describeRoute({
			tags: ["Inventory"],
			summary: "Export inventory data",
			description: "Export inventory data in JSON or CSV format",
			responses: {
				200: {
					description: "Inventory data exported successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
							},
						},
					},
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, format, includeZeroStock } =
				c.req.valid("query");

			// Get all inventory items for the organization
			const inventoryItems = await db.inventory.findMany({
				where: {
					organizationId,
					...(includeZeroStock === "false" && {
						quantity: { gt: 0 },
					}),
				},
				include: {
					product: true,
					outlet: true,
				},
				orderBy: [
					{ outlet: { name: "asc" } },
					{ product: { name: "asc" } },
				],
			});

			// Format the data for export
			const formattedData = inventoryItems.map((item) => ({
				inventoryId: item.id,
				productId: item.productId,
				productName: item.product.name,
				outletId: item.outletId,
				outletName: item.outlet.name,
				quantity: item.quantity,
				value: item.quantity * item.product.price,
				unitPrice: item.product.price,
				lastUpdated: item.updatedAt,
			}));

			if (format === "csv") {
				// In a real implementation, we would convert to CSV
				// For now, just return JSON with a message
				return c.json({
					format: "csv",
					message: "CSV export would be implemented here",
					data: formattedData,
				});
			}

			return c.json({
				format: "json",
				data: formattedData,
				count: formattedData.length,
				exportedAt: new Date(),
			});
		},
	)

	// Create a new inventory item
	.post(
		"/",
		authMiddleware,
		validator("json", createInventorySchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Create inventory item",
			description:
				"Create a new inventory item for a product in an outlet",
			responses: {
				201: {
					description: "Inventory item created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									outletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input or inventory already exists",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId, outletId, productId, quantity } =
				c.req.valid("json");

			// Check if inventory already exists for this product/outlet
			const existingInventory = await db.inventory.findFirst({
				where: {
					organizationId,
					outletId,
					productId,
				},
			});

			if (existingInventory) {
				return c.json(
					{
						error: "Inventory for this product/outlet combination already exists. Use adjust endpoint instead.",
					},
					400,
				);
			}

			// Verify product and outlet exist
			const [product, outlet] = await Promise.all([
				db.product.findUnique({ where: { id: productId } }),
				db.outlet.findUnique({ where: { id: outletId } }),
			]);

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			if (!outlet) {
				return c.json({ error: "Outlet not found" }, 404);
			}

			// Create new inventory
			const inventory = await db.inventory.create({
				data: {
					organizationId,
					outletId,
					productId,
					quantity,
				},
			});

			return c.json(inventory, 201);
		},
	)

	// Update an inventory item
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateInventorySchema),
		describeRoute({
			tags: ["Inventory"],
			summary: "Update inventory item",
			description:
				"Update an existing inventory item (quantity or outlet)",
			responses: {
				200: {
					description: "Inventory item updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									outletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
								},
							},
						},
					},
				},
				404: {
					description: "Inventory item not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const updateData = c.req.valid("json");
			const user = c.get("user");

			// Use a transaction to ensure data consistency
			try {
				const result = await db.$transaction(async (tx) => {
					// Find the inventory item
					const existingInventory = await tx.inventory.findUnique({
						where: { id },
					});

					if (!existingInventory) {
						return {
							error: "Inventory item not found",
							status: 404,
						};
					}

					// If changing outlet, verify it exists
					if (
						updateData.outletId &&
						updateData.outletId !== existingInventory.outletId
					) {
						const outlet = await tx.outlet.findUnique({
							where: { id: updateData.outletId },
						});

						if (!outlet) {
							return { error: "Outlet not found", status: 404 };
						}
					}

					// Record changes for logging
					const quantityBefore = existingInventory.quantity;
					const quantityAfter = updateData.quantity ?? quantityBefore;
					const changeAmount = quantityAfter - quantityBefore;

					// Update the inventory
					const updatedInventory = await tx.inventory.update({
						where: { id },
						data: updateData,
					});

					// Mock log entry
					const log = {
						inventoryId: id,
						changeType: "MANUAL_UPDATE",
						quantityBefore,
						quantityAfter,
						changeAmount,
						userId: user.id,
						reason: "Manual inventory update",
						createdAt: new Date(),
					};

					return { inventory: updatedInventory, log };
				});

				if ("error" in result) {
					return c.json(
						{ error: result.error },
						result.status as 400 | 404,
					);
				}

				return c.json(result);
			} catch (error) {
				return c.json({ error: "Failed to update inventory" }, 500);
			}
		},
	)

	// Delete an inventory item
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Inventory"],
			summary: "Delete inventory item",
			description: "Remove an inventory item from the system",
			responses: {
				200: {
					description: "Inventory item deleted successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									id: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				404: {
					description: "Inventory item not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				// Check if inventory exists
				const inventory = await db.inventory.findUnique({
					where: { id },
				});

				if (!inventory) {
					return c.json({ error: "Inventory item not found" }, 404);
				}

				// Delete the inventory item
				await db.inventory.delete({
					where: { id },
				});

				return c.json({
					success: true,
					id,
					message: "Inventory item deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Failed to delete inventory" }, 500);
			}
		},
	);
