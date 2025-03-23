import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const purchaseOrdersQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	supplierId: z.string().optional(),
	status: z
		.enum(["DRAFT", "SUBMITTED", "APPROVED", "RECEIVED", "CANCELLED"])
		.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
});

const createPurchaseOrderSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	supplierId: z.string().nonempty("Supplier ID is required"),
	poNumber: z.string().optional(),
	orderDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	expectedDeliveryDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	status: z
		.enum(["DRAFT", "SUBMITTED", "APPROVED", "RECEIVED", "CANCELLED"])
		.default("DRAFT"),
	notes: z.string().optional(),
	items: z
		.array(
			z.object({
				productId: z.string().nonempty("Product ID is required"),
				quantity: z.number().min(1, "Quantity must be at least 1"),
				unitPrice: z.number().optional(),
			}),
		)
		.optional(),
});

const updatePurchaseOrderSchema = z.object({
	supplierId: z.string().optional(),
	poNumber: z.string().optional(),
	orderDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	expectedDeliveryDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	status: z
		.enum(["DRAFT", "SUBMITTED", "APPROVED", "RECEIVED", "CANCELLED"])
		.optional(),
	notes: z.string().optional(),
});

const addOrderItemSchema = z.object({
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().min(1, "Quantity must be at least 1"),
	unitPrice: z.number().optional(),
});

const updateOrderItemSchema = z.object({
	quantity: z.number().min(1, "Quantity must be at least 1").optional(),
	unitPrice: z.number().optional(),
});

export const purchaseOrderRouter = new Hono()
	.basePath("/purchase-orders")
	// GET all purchase orders
	.get(
		"/",
		authMiddleware,
		validator("query", purchaseOrdersQuerySchema),
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "List all purchase orders",
			description:
				"Retrieve a list of purchase orders with optional filtering",
			responses: {
				200: {
					description: "List of purchase orders",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										poNumber: { type: "string" },
										supplierId: { type: "string" },
										supplier: {
											type: "object",
											properties: {
												name: { type: "string" },
											},
										},
										status: { type: "string" },
										orderDate: {
											type: "string",
											format: "date-time",
										},
										expectedDeliveryDate: {
											type: "string",
											format: "date-time",
										},
										totalAmount: { type: "number" },
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
		}),
		async (c) => {
			const { organizationId, supplierId, status, dateFrom, dateTo } =
				c.req.valid("query");

			const where: any = { organizationId };

			if (supplierId) {
				where.supplierId = supplierId;
			}

			if (status) {
				where.status = status;
			}

			if (dateFrom || dateTo) {
				where.orderDate = {};
				if (dateFrom) {
					where.orderDate.gte = new Date(dateFrom);
				}
				if (dateTo) {
					where.orderDate.lte = new Date(dateTo);
				}
			}

			const purchaseOrders = await db.purchaseOrder.findMany({
				where,
				include: {
					supplier: {
						select: {
							name: true,
						},
					},
					items: {
						include: {
							product: {
								select: {
									name: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return c.json(purchaseOrders);
		},
	)
	// GET a single purchase order by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Get purchase order details",
			description:
				"Retrieve detailed information about a specific purchase order",
			responses: {
				200: {
					description: "Purchase order details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									poNumber: { type: "string" },
									organizationId: { type: "string" },
									supplierId: { type: "string" },
									supplier: {
										type: "object",
										properties: {
											name: { type: "string" },
											email: { type: "string" },
											phone: { type: "string" },
										},
									},
									status: { type: "string" },
									orderDate: {
										type: "string",
										format: "date-time",
									},
									expectedDeliveryDate: {
										type: "string",
										format: "date-time",
									},
									items: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												productId: { type: "string" },
												product: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
													},
												},
												quantity: { type: "number" },
												unitPrice: { type: "number" },
												totalPrice: { type: "number" },
											},
										},
									},
									totalAmount: { type: "number" },
									notes: { type: "string" },
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
					description: "Purchase order not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("id");

			const purchaseOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
				include: {
					supplier: {
						select: {
							name: true,
							contact: true,
							address: true,
						},
					},
					items: {
						include: {
							product: {
								select: {
									name: true,
								},
							},
						},
					},
				},
			});

			if (!purchaseOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			return c.json(purchaseOrder);
		},
	)
	// CREATE a new purchase order
	.post(
		"/",
		authMiddleware,
		validator("json", createPurchaseOrderSchema),
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Create a new purchase order",
			description:
				"Create a new purchase order with optional initial line items",
			responses: {
				201: {
					description: "Purchase order created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									poNumber: { type: "string" },
									status: { type: "string" },
									organizationId: { type: "string" },
									supplierId: { type: "string" },
									createdAt: {
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
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			const { items, ...orderData } = data;

			// Generate PO number if not provided
			if (!orderData.poNumber) {
				const date = new Date();
				const randomPart = Math.floor(Math.random() * 10000)
					.toString()
					.padStart(4, "0");
				orderData.poNumber = `PO-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${randomPart}`;
			}

			// Create dates from strings if provided
			if (orderData.orderDate) {
				orderData.orderDate = new Date(orderData.orderDate);
			}

			if (orderData.expectedDeliveryDate) {
				orderData.expectedDeliveryDate = new Date(
					orderData.expectedDeliveryDate,
				);
			}

			try {
				// Create purchase order with items if provided
				const purchaseOrder = await db.purchaseOrder.create({
					data: {
						...orderData,
						items: items
							? {
									create: items.map((item) => ({
										productId: item.productId,
										quantity: item.quantity,
										unitPrice: item.unitPrice || 0,
									})),
								}
							: undefined,
					} as any, // Type assertion to bypass type checking temporarily
					include: {
						items: true,
					},
				});

				// Calculate and update total amount
				if (items && items.length > 0) {
					const totalAmount = items.reduce(
						(sum, item) =>
							sum + item.quantity * (item.unitPrice || 0),
						0,
					);

					await db.purchaseOrder.update({
						where: { id: purchaseOrder.id },
						data: { totalAmount },
					});

					return c.json(
						{
							...purchaseOrder,
							totalAmount,
						},
						201,
					);
				}

				return c.json(purchaseOrder, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create purchase order",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a purchase order
	.put(
		"/:id",
		authMiddleware,
		validator("json", updatePurchaseOrderSchema),
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Update a purchase order",
			description: "Update the details of an existing purchase order",
			responses: {
				200: {
					description: "Purchase order updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									poNumber: { type: "string" },
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
					description: "Cannot update a completed or cancelled order",
				},
				404: {
					description: "Purchase order not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("id");
			const data = c.req.valid("json");

			// Find the current order
			const currentOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
			});

			if (!currentOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			// Don't allow updates to RECEIVED or CANCELLED orders
			if (
				currentOrder.status === "RECEIVED" ||
				currentOrder.status === "CANCELLED"
			) {
				return c.json(
					{
						error: "Cannot update a completed or cancelled purchase order",
					},
					400,
				);
			}

			// Format dates
			const updateData: any = { ...data };
			if (updateData.orderDate) {
				updateData.orderDate = new Date(updateData.orderDate);
			}

			if (updateData.expectedDeliveryDate) {
				updateData.expectedDeliveryDate = new Date(
					updateData.expectedDeliveryDate,
				);
			}

			try {
				const updatedOrder = await db.purchaseOrder.update({
					where: { id: purchaseOrderId },
					data: updateData,
				});

				return c.json(updatedOrder);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update purchase order",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a purchase order
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Delete a purchase order",
			description:
				"Delete a purchase order (only allowed for DRAFT status)",
			responses: {
				200: {
					description: "Purchase order deleted successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: {
					description:
						"Cannot delete a submitted, approved, or received order",
				},
				404: {
					description: "Purchase order not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("id");

			// Find the current order
			const currentOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
			});

			if (!currentOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			// Only allow deletion of DRAFT or CANCELLED orders
			if (
				currentOrder.status !== "DRAFT" &&
				currentOrder.status !== "CANCELLED"
			) {
				return c.json(
					{
						error: "Cannot delete a submitted, approved, or received purchase order",
					},
					400,
				);
			}

			try {
				// Delete order items first
				await db.purchaseOrderItem.deleteMany({
					where: { purchaseOrderId },
				});

				// Then delete the order
				await db.purchaseOrder.delete({
					where: { id: purchaseOrderId },
				});

				return c.json({
					success: true,
					message: "Purchase order deleted successfully",
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete purchase order",
						details: error,
					},
					400,
				);
			}
		},
	)
	// ADD an item to a purchase order
	.post(
		"/:id/items",
		authMiddleware,
		validator("json", addOrderItemSchema),
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Add item to purchase order",
			description: "Add a new line item to an existing purchase order",
			responses: {
				201: {
					description: "Item added successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									purchaseOrderId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
									unitPrice: { type: "number" },
								},
							},
						},
					},
				},
				400: {
					description: "Cannot modify a completed or cancelled order",
				},
				404: {
					description: "Purchase order not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("id");
			const itemData = c.req.valid("json");

			// Find the current order
			const currentOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
				include: { items: true },
			});

			if (!currentOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			// Don't allow updates to RECEIVED or CANCELLED orders
			if (
				currentOrder.status === "RECEIVED" ||
				currentOrder.status === "CANCELLED"
			) {
				return c.json(
					{
						error: "Cannot modify a completed or cancelled purchase order",
					},
					400,
				);
			}

			// Check if the product is already in the order
			const existingItem = currentOrder.items.find(
				(item) => item.productId === itemData.productId,
			);

			try {
				let newItem: any; // Explicitly type as any for flexibility

				if (existingItem) {
					// Update quantity of existing item
					newItem = await db.purchaseOrderItem.update({
						where: { id: existingItem.id },
						data: {
							quantity: existingItem.quantity + itemData.quantity,
							unitPrice:
								itemData.unitPrice || existingItem.unitPrice,
						},
					});
				} else {
					// Create a new item
					newItem = await db.purchaseOrderItem.create({
						data: {
							purchaseOrderId,
							productId: itemData.productId,
							quantity: itemData.quantity,
							unitPrice: itemData.unitPrice || 0,
						},
					});
				}

				// Recalculate total amount
				const allItems = await db.purchaseOrderItem.findMany({
					where: { purchaseOrderId },
				});

				const totalAmount = allItems.reduce(
					(sum, item) => sum + item.quantity * item.unitPrice,
					0,
				);

				await db.purchaseOrder.update({
					where: { id: purchaseOrderId },
					data: { totalAmount },
				});

				return c.json(newItem, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to add item to purchase order",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an item in a purchase order
	.put(
		"/:orderId/items/:itemId",
		authMiddleware,
		validator("json", updateOrderItemSchema),
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Update purchase order item",
			description:
				"Update the quantity or unit price of a line item in a purchase order",
			responses: {
				200: {
					description: "Item updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									purchaseOrderId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
									unitPrice: { type: "number" },
								},
							},
						},
					},
				},
				400: {
					description: "Cannot modify a completed or cancelled order",
				},
				404: {
					description: "Purchase order or item not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("orderId");
			const itemId = c.req.param("itemId");
			const updateData = c.req.valid("json");

			// Find the current order
			const currentOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
			});

			if (!currentOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			// Don't allow updates to RECEIVED or CANCELLED orders
			if (
				currentOrder.status === "RECEIVED" ||
				currentOrder.status === "CANCELLED"
			) {
				return c.json(
					{
						error: "Cannot modify a completed or cancelled purchase order",
					},
					400,
				);
			}

			try {
				// Update the item
				const updatedItem = await db.purchaseOrderItem.update({
					where: {
						id: itemId,
						purchaseOrderId, // Ensure item belongs to the order
					},
					data: updateData,
				});

				// Recalculate total amount
				const allItems = await db.purchaseOrderItem.findMany({
					where: { purchaseOrderId },
				});

				const totalAmount = allItems.reduce(
					(sum, item) => sum + item.quantity * item.unitPrice,
					0,
				);

				await db.purchaseOrder.update({
					where: { id: purchaseOrderId },
					data: { totalAmount },
				});

				return c.json(updatedItem);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update purchase order item",
						details: error,
					},
					404,
				);
			}
		},
	)
	// DELETE an item from a purchase order
	.delete(
		"/:orderId/items/:itemId",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Orders"],
			summary: "Delete purchase order item",
			description: "Remove a line item from a purchase order",
			responses: {
				200: {
					description: "Item deleted successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: {
					description: "Cannot modify a completed or cancelled order",
				},
				404: {
					description: "Purchase order or item not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrderId = c.req.param("orderId");
			const itemId = c.req.param("itemId");

			// Find the current order
			const currentOrder = await db.purchaseOrder.findUnique({
				where: { id: purchaseOrderId },
			});

			if (!currentOrder) {
				return c.json({ error: "Purchase order not found" }, 404);
			}

			// Don't allow updates to RECEIVED or CANCELLED orders
			if (
				currentOrder.status === "RECEIVED" ||
				currentOrder.status === "CANCELLED"
			) {
				return c.json(
					{
						error: "Cannot modify a completed or cancelled purchase order",
					},
					400,
				);
			}

			try {
				// Delete the item
				await db.purchaseOrderItem.delete({
					where: {
						id: itemId,
						purchaseOrderId, // Ensure item belongs to the order
					},
				});

				// Recalculate total amount
				const allItems = await db.purchaseOrderItem.findMany({
					where: { purchaseOrderId },
				});

				const totalAmount = allItems.reduce(
					(sum, item) => sum + item.quantity * item.unitPrice,
					0,
				);

				await db.purchaseOrder.update({
					where: { id: purchaseOrderId },
					data: { totalAmount },
				});

				return c.json({
					success: true,
					message: "Purchase order item deleted successfully",
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete purchase order item",
						details: error,
					},
					404,
				);
			}
		},
	);
