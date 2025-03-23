import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
/* import { roleMiddleware } from "../../middleware/role";
 */
// === Schemas ===
const saleItemSchema = z.object({
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int().positive("Quantity must be a positive integer"),
	unitPrice: z.number().positive("Unit price must be positive"),
	discountAmount: z.number().min(0, "Discount cannot be negative").default(0),
});

const createSaleSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	customerId: z.string().optional(),
	items: z.array(saleItemSchema).min(1, "At least one item is required"),
	discountAmount: z.number().min(0, "Discount cannot be negative").default(0),
	taxRate: z.number().min(0, "Tax rate cannot be negative").default(0),
	paymentMethod: z.enum(["CASH", "CARD", "MOBILE_PAYMENT", "OTHER"]),
	status: z.enum(["DRAFT", "COMPLETED", "VOIDED"]).default("COMPLETED"),
	notes: z.string().optional(),
});

const salesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().optional(),
	customerId: z.string().optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	status: z.enum(["DRAFT", "COMPLETED", "VOIDED", "REFUNDED"]).optional(),
	minAmount: z.number().optional(),
	maxAmount: z.number().optional(),
	limit: z.number().default(20),
	offset: z.number().default(0),
	sortBy: z.enum(["createdAt", "totalAmount"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updateSaleSchema = z.object({
	customerId: z.string().optional(),
	status: z.enum(["DRAFT", "COMPLETED", "VOIDED", "REFUNDED"]).optional(),
	notes: z.string().optional(),
});

const calculateSaleSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	items: z.array(saleItemSchema).min(1, "At least one item is required"),
	discountAmount: z.number().min(0, "Discount cannot be negative").default(0),
	taxRate: z.number().min(0, "Tax rate cannot be negative").default(0),
});

const generateReceiptSchema = z.object({
	saleId: z.string().nonempty("Sale ID is required"),
	recipientEmail: z.string().email().optional(),
	recipientPhone: z.string().optional(),
});

// Type for the create sale request
type CreateSaleRequest = z.infer<typeof createSaleSchema>;

export const salesRouter = new Hono()
	.basePath("/sales")
	// CREATE a new sale
	.post(
		"/",
		authMiddleware,
		/* roleMiddleware({ resource: "sales", action: "write" }), */ // Only users with "sales:write" permission
		validator("json", createSaleSchema),
		describeRoute({
			tags: ["Sales"],
			summary: "Create a new sale",
			description:
				"Record a new sale transaction with inventory integration",
			responses: {
				201: {
					description: "Sale created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									outletId: { type: "string" },
									totalAmount: { type: "number" },
									status: { type: "string" },
									items: {
										type: "array",
										items: {
											type: "object",
										},
									},
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input or insufficient inventory",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json") as CreateSaleRequest;
			const {
				organizationId,
				outletId,
				customerId,
				items,
				discountAmount,
				taxRate,
				paymentMethod,
				status,
				notes,
			} = data;
			const user = c.get("user");

			// Calculate the total amount from items, discounts, and tax
			const subtotal = items.reduce(
				(sum: number, item) =>
					sum +
					(item.quantity * item.unitPrice -
						(item.discountAmount || 0)),
				0,
			);
			const totalBeforeTax = subtotal - discountAmount;
			const totalAmount =
				totalBeforeTax + (totalBeforeTax * taxRate) / 100;

			try {
				// Use a transaction to ensure consistency between sales and inventory
				const result = await db.$transaction(async (tx) => {
					// Check inventory availability for all items
					for (const item of items) {
						const inventory = await tx.inventory.findFirst({
							where: {
								organizationId,
								outletId,
								productId: item.productId,
							},
						});

						// Check if enough inventory is available
						if (!inventory || inventory.quantity < item.quantity) {
							throw new Error(
								`Insufficient inventory for product ${item.productId}`,
							);
						}
					}

					// Create the sale
					const sale = await tx.sale.create({
						data: {
							organizationId,
							outletId,
							userId: user.id,
							customerId,
							totalAmount,
							status,
							saleItems: {
								create: items.map((item) => ({
									productId: item.productId,
									quantity: item.quantity,
									unitPrice: item.unitPrice,
									totalPrice:
										item.quantity * item.unitPrice -
										(item.discountAmount || 0),
								})),
							},
						},
						include: {
							saleItems: true,
						},
					});

					// Update inventory for each item if the sale is COMPLETED
					if (status === "COMPLETED") {
						for (const item of items) {
							await tx.inventory.updateMany({
								where: {
									organizationId,
									outletId,
									productId: item.productId,
								},
								data: {
									quantity: {
										decrement: item.quantity,
									},
								},
							});
						}
					}

					return sale;
				});

				return c.json(result, 201);
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to create sale" }, 500);
			}
		},
	)
	// GET all sales with filtering
	.get(
		"/",
		authMiddleware,
		validator("query", salesQuerySchema),
		describeRoute({
			tags: ["Sales"],
			summary: "List all sales",
			description:
				"Retrieve a list of sales with filtering and pagination options",
			responses: {
				200: {
					description: "List of sales",
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
												totalAmount: { type: "number" },
												status: { type: "string" },
												createdAt: {
													type: "string",
													format: "date-time",
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
				outletId,
				customerId,
				startDate,
				endDate,
				status,
				minAmount,
				maxAmount,
				limit,
				offset,
				sortBy,
				sortOrder,
			} = c.req.valid("query");

			// Build the where clause for filtering
			const where = {
				organizationId,
				...(outletId && { outletId }),
				...(customerId && { customerId }),
				...(status && { status }),
				...(startDate &&
					endDate && {
						createdAt: {
							gte: new Date(startDate),
							lte: new Date(endDate),
						},
					}),
				...(startDate &&
					!endDate && {
						createdAt: {
							gte: new Date(startDate),
						},
					}),
				...(!startDate &&
					endDate && {
						createdAt: {
							lte: new Date(endDate),
						},
					}),
				...(minAmount !== undefined && {
					totalAmount: { gte: minAmount },
				}),
				...(maxAmount !== undefined && {
					totalAmount: { lte: maxAmount },
				}),
			};

			// Count total items for pagination
			const total = await db.sale.count({ where });

			// Get sales with pagination
			const items = await db.sale.findMany({
				where,
				include: {
					outlet: {
						select: {
							name: true,
						},
					},
					customer: {
						select: {
							name: true,
							phone: true,
						},
					},
					user: {
						select: {
							name: true,
						},
					},
					saleItems: {
						include: {
							product: {
								select: {
									name: true,
								},
							},
						},
					},
				},
				orderBy: {
					[sortBy]: sortOrder,
				},
				skip: offset,
				take: limit,
			});

			return c.json({ items, total });
		},
	)
	// GET a specific sale by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Sales"],
			summary: "Get a specific sale",
			description: "Retrieve detailed information about a specific sale",
			responses: {
				200: {
					description: "Sale details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									outletId: { type: "string" },
									totalAmount: { type: "number" },
									status: { type: "string" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									items: {
										type: "array",
										items: {
											type: "object",
										},
									},
								},
							},
						},
					},
				},
				404: {
					description: "Sale not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			const sale = await db.sale.findUnique({
				where: { id },
				include: {
					outlet: true,
					customer: true,
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					saleItems: {
						include: {
							product: true,
						},
					},
				},
			});

			if (!sale) {
				return c.json({ error: "Sale not found" }, 404);
			}

			return c.json(sale);
		},
	)
	// UPDATE a sale
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateSaleSchema),
		describeRoute({
			tags: ["Sales"],
			summary: "Update a sale",
			description:
				"Update sale details like status or customer information",
			responses: {
				200: {
					description: "Sale updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									status: { type: "string" },
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
					description: "Invalid input",
				},
				404: {
					description: "Sale not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const updateData = c.req.valid("json");

			try {
				// Use a transaction for updating the sale and handling inventory changes
				const result = await db.$transaction(async (tx) => {
					// Get the current sale with items
					const currentSale = await tx.sale.findUnique({
						where: { id },
						include: {
							saleItems: true,
						},
					});

					if (!currentSale) {
						throw new Error("Sale not found");
					}

					// Handle status change for inventory adjustment
					if (
						updateData.status &&
						currentSale.status !== updateData.status
					) {
						// If changing from COMPLETED to VOIDED, restore inventory
						if (
							currentSale.status === "COMPLETED" &&
							updateData.status === "VOIDED"
						) {
							// Add inventory back for each item
							for (const item of currentSale.saleItems) {
								await tx.inventory.updateMany({
									where: {
										organizationId:
											currentSale.organizationId,
										outletId: currentSale.outletId,
										productId: item.productId,
									},
									data: {
										quantity: {
											increment: item.quantity,
										},
									},
								});
							}
						}
						// If changing from DRAFT to COMPLETED, deduct inventory
						else if (
							currentSale.status === "DRAFT" &&
							updateData.status === "COMPLETED"
						) {
							// Check and update inventory for each item
							for (const item of currentSale.saleItems) {
								const inventory = await tx.inventory.findFirst({
									where: {
										organizationId:
											currentSale.organizationId,
										outletId: currentSale.outletId,
										productId: item.productId,
									},
								});

								if (
									!inventory ||
									inventory.quantity < item.quantity
								) {
									throw new Error(
										`Insufficient inventory for product ${item.productId}`,
									);
								}

								await tx.inventory.updateMany({
									where: {
										organizationId:
											currentSale.organizationId,
										outletId: currentSale.outletId,
										productId: item.productId,
									},
									data: {
										quantity: {
											decrement: item.quantity,
										},
									},
								});
							}
						}
					}

					// Update the sale
					const updatedSale = await tx.sale.update({
						where: { id },
						data: updateData,
					});

					return updatedSale;
				});

				return c.json(result);
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to update sale" }, 500);
			}
		},
	)
	// DELETE (void) a sale
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Sales"],
			summary: "Void/cancel a sale",
			description: "Mark a sale as voided and restore inventory",
			responses: {
				200: {
					description: "Sale voided successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									id: { type: "string" },
								},
							},
						},
					},
				},
				404: {
					description: "Sale not found",
				},
				400: {
					description: "Cannot void this sale",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				// Use a transaction for updating the sale and handling inventory
				const result = await db.$transaction(async (tx) => {
					// Get the current sale with items
					const sale = await tx.sale.findUnique({
						where: { id },
						include: {
							saleItems: true,
						},
					});

					if (!sale) {
						throw new Error("Sale not found");
					}

					// Only allow voiding COMPLETED or DRAFT sales
					if (
						sale.status !== "COMPLETED" &&
						sale.status !== "DRAFT"
					) {
						throw new Error(
							"Only COMPLETED or DRAFT sales can be voided",
						);
					}

					// If the sale was COMPLETED, restore inventory
					if (sale.status === "COMPLETED") {
						for (const item of sale.saleItems) {
							await tx.inventory.updateMany({
								where: {
									organizationId: sale.organizationId,
									outletId: sale.outletId,
									productId: item.productId,
								},
								data: {
									quantity: {
										increment: item.quantity,
									},
								},
							});
						}
					}

					// Update sale status to VOIDED
					await tx.sale.update({
						where: { id },
						data: {
							status: "VOIDED",
						},
					});

					return { success: true, id };
				});

				return c.json(result);
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to void sale" }, 500);
			}
		},
	)
	// CALCULATE sale totals
	.post(
		"/calculate",
		authMiddleware,
		validator("json", calculateSaleSchema),
		describeRoute({
			tags: ["Sales"],
			summary: "Calculate sale totals",
			description:
				"Calculate subtotal, tax, and final amount before finalizing a sale",
			responses: {
				200: {
					description: "Calculated sale details",
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
												productId: { type: "string" },
												productName: { type: "string" },
												quantity: { type: "number" },
												unitPrice: { type: "number" },
												lineTotal: { type: "number" },
												discountAmount: {
													type: "number",
												},
											},
										},
									},
									subtotal: { type: "number" },
									discountAmount: { type: "number" },
									totalBeforeTax: { type: "number" },
									taxAmount: { type: "number" },
									totalAmount: { type: "number" },
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
			const { organizationId, items, discountAmount, taxRate } =
				c.req.valid("json");

			try {
				// Get product details for each item
				const productIds = items.map((item) => item.productId);
				const products = await db.product.findMany({
					where: {
						id: { in: productIds },
						organizationId,
					},
					select: {
						id: true,
						name: true,
						price: true,
					},
				});

				// Create a map for efficient lookup
				const productMap = products.reduce(
					(acc, product) => {
						acc[product.id] = product;
						return acc;
					},
					{} as Record<string, (typeof products)[0]>,
				);

				// Calculate line totals
				const calculatedItems = items.map((item) => {
					const product = productMap[item.productId];
					if (!product) {
						throw new Error(`Product not found: ${item.productId}`);
					}

					const lineTotal = item.quantity * item.unitPrice;
					const lineTotalAfterDiscount =
						lineTotal - (item.discountAmount || 0);

					return {
						productId: item.productId,
						productName: product.name,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						lineTotal,
						discountAmount: item.discountAmount || 0,
						lineTotalAfterDiscount,
					};
				});

				// Calculate overall totals
				const subtotal = calculatedItems.reduce(
					(sum, item) => sum + item.lineTotal,
					0,
				);
				const totalBeforeTax = subtotal - discountAmount;
				const taxAmount = (totalBeforeTax * taxRate) / 100;
				const totalAmount = totalBeforeTax + taxAmount;

				return c.json({
					items: calculatedItems,
					subtotal,
					discountAmount,
					totalBeforeTax,
					taxRate,
					taxAmount,
					totalAmount,
				});
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to calculate sale" }, 500);
			}
		},
	)
	// GENERATE receipt
	.post(
		"/receipt",
		authMiddleware,
		validator("json", generateReceiptSchema),
		describeRoute({
			tags: ["Sales"],
			summary: "Generate and send receipt",
			description:
				"Generate a receipt for a sale and optionally send it to the customer",
			responses: {
				200: {
					description: "Receipt generated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									receiptUrl: { type: "string" },
									emailSent: { type: "boolean" },
								},
							},
						},
					},
				},
				404: {
					description: "Sale not found",
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
			const { saleId, recipientEmail, recipientPhone } =
				c.req.valid("json");

			// Find the sale with all related data
			const sale = await db.sale.findUnique({
				where: { id: saleId },
				include: {
					outlet: true,
					customer: true,
					user: {
						select: {
							name: true,
						},
					},
					saleItems: {
						include: {
							product: true,
						},
					},
					organization: {
						select: {
							name: true,
							settings: true,
						},
					},
				},
			});

			if (!sale) {
				return c.json({ error: "Sale not found" }, 404);
			}

			// Generate receipt (this is a mock implementation)
			// In a real implementation, you would:
			// 1. Format the sale data into a receipt template
			// 2. Generate a PDF or HTML receipt
			// 3. Store it or make it available for download
			// 4. Optionally send it via email or SMS

			const mockReceiptUrl = `https://app.yourpos.com/receipts/${saleId}`;
			let emailSent = false;

			// Mock sending email if recipient provided
			if (recipientEmail) {
				// In a real implementation, you would use an email service
				// await emailService.sendReceipt(recipientEmail, receiptPdf);
				emailSent = true;
			}

			return c.json({
				success: true,
				receiptUrl: mockReceiptUrl,
				emailSent,
				message: recipientEmail
					? `Receipt sent to ${recipientEmail}`
					: "Receipt generated successfully",
			});
		},
	);
