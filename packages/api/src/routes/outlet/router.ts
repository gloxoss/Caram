import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
/* import { memberRoleMiddleware } from "../../middleware";
 */ import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const outletsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const createOutletSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	location: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zipCode: z.string().optional(),
	country: z.string().optional(),
	isMain: z.boolean().optional(),
	notes: z.string().optional(),
});

const updateOutletSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	location: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zipCode: z.string().optional(),
	country: z.string().optional(),
	isMain: z.boolean().optional(),
	notes: z.string().optional(),
});

export const outletsRouter = new Hono()
	.basePath("/outlets")
	// GET all outlets
	.get(
		"/",
		authMiddleware,
		/* memberRoleMiddleware({ resource: "outlets", action: "read" }), */ // Only users with "outlets:read" permission
		validator("query", outletsQuerySchema),
		describeRoute({
			tags: ["Outlets"],
			summary: "List all outlets for an organization",
			description:
				"Retrieve a list of outlets associated with the specified organization ID",
			/* parameters: [
				{
					name: "organizationId",
					in: "query",
					required: true,
					schema: { type: "string" },
				},
			], */
			responses: {
				200: {
					description: "List of outlets",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										organizationId: { type: "string" },
										location: { type: "string" },
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
				},
				400: {
					description: "Invalid or missing organizationId",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									error: { type: "string" },
								},
							},
						},
					},
				},
			},
		}),
		async (c) => {
			const { organizationId } = c.req.valid("query");
			const outlets = await db.outlet.findMany({
				where: { organizationId },
				orderBy: { createdAt: "desc" },
			});
			return c.json(outlets);
		},
	)
	// GET a single outlet by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Outlets"],
			summary: "Get outlet details",
			description:
				"Retrieve detailed information about a specific outlet",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
			], */
			responses: {
				200: {
					description: "Outlet details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									location: { type: "string" },
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
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");

			const outlet = await db.outlet.findUnique({
				where: { id: outletId },
			});

			if (!outlet) {
				return c.json({ error: "Outlet not found" }, 404);
			}

			return c.json(outlet);
		},
	)
	// CREATE a new outlet
	.post(
		"/",
		authMiddleware,
		validator("json", createOutletSchema),
		describeRoute({
			tags: ["Outlets"],
			summary: "Create a new outlet",
			description: "Create a new outlet location for an organization",
			/* requestBody: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["organizationId", "name"],
							properties: {
								organizationId: { type: "string" },
								name: { type: "string" },
								location: { type: "string" },
								phone: { type: "string" },
								email: { type: "string" },
								address: { type: "string" },
								city: { type: "string" },
								state: { type: "string" },
								zipCode: { type: "string" },
								country: { type: "string" },
								isMain: { type: "boolean" },
								notes: { type: "string" },
							},
						},
					},
				},
			}, */
			responses: {
				201: {
					description: "Outlet created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									location: { type: "string" },
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
					description: "Invalid input",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// If this is marked as the main outlet and isMain is true,
			// we need to unset any existing main outlet
			if (data.isMain) {
				await db.outlet.updateMany({
					where: {
						organizationId: data.organizationId,
					} as any,
					data: {} as any,
				});
			}

			const outlet = await db.outlet.create({
				data,
			});

			return c.json(outlet, 201);
		},
	)
	// UPDATE an outlet
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateOutletSchema),
		describeRoute({
			tags: ["Outlets"],
			summary: "Update an outlet",
			description: "Update details of an existing outlet",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
			], */
			/* requestBody: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								name: { type: "string" },
								location: { type: "string" },
								phone: { type: "string" },
								email: { type: "string" },
								address: { type: "string" },
								city: { type: "string" },
								state: { type: "string" },
								zipCode: { type: "string" },
								country: { type: "string" },
								isMain: { type: "boolean" },
								notes: { type: "string" },
							},
						},
					},
				},
			}, */
			responses: {
				200: {
					description: "Outlet updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									location: { type: "string" },
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
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");
			const data = c.req.valid("json");

			try {
				// If this outlet is being set as main, clear other main outlets
				if (data.isMain) {
					const currentOutlet = await db.outlet.findUnique({
						where: { id: outletId },
						select: { organizationId: true },
					});

					if (currentOutlet) {
						await db.outlet.updateMany({
							where: {
								organizationId: currentOutlet.organizationId,
								id: { not: outletId },
							} as any,
							data: {} as any,
						});
					}
				}

				const outlet = await db.outlet.update({
					where: { id: outletId },
					data,
				});

				return c.json(outlet);
			} catch (error) {
				return c.json({ error: "Outlet not found" }, 404);
			}
		},
	)
	// DELETE an outlet
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Outlets"],
			summary: "Delete an outlet",
			description:
				"Delete an existing outlet (will fail if outlet has associated inventory or sales)",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
			], */
			responses: {
				200: {
					description: "Outlet deleted successfully",
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
					description: "Cannot delete outlet with associated data",
				},
				404: {
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");

			try {
				// Check if outlet has associated inventory or sales
				const [inventoryCount, salesCount] = await Promise.all([
					db.inventory.count({ where: { outletId } }),
					db.sale.count({ where: { outletId } }),
				]);

				if (inventoryCount > 0 || salesCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete outlet with associated inventory or sales data",
						},
						400,
					);
				}

				await db.outlet.delete({
					where: { id: outletId },
				});

				return c.json({
					success: true,
					message: "Outlet deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Outlet not found" }, 404);
			}
		},
	)
	// GET inventory for a specific outlet
	.get(
		"/:id/inventory",
		authMiddleware,
		describeRoute({
			tags: ["Outlets"],
			summary: "Get outlet inventory",
			description: "Retrieve all inventory items for a specific outlet",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
			], */
			responses: {
				200: {
					description: "Outlet inventory",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										productId: { type: "string" },
										quantity: { type: "number" },
										product: {
											type: "object",
											properties: {
												name: { type: "string" },
												price: { type: "number" },
											},
										},
									},
								},
							},
						},
					},
				},
				404: {
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");

			// Verify outlet exists
			const outlet = await db.outlet.findUnique({
				where: { id: outletId },
			});

			if (!outlet) {
				return c.json({ error: "Outlet not found" }, 404);
			}

			// Get all inventory items for this outlet with product details
			const inventory = await db.inventory.findMany({
				where: { outletId },
				include: {
					product: {
						select: {
							id: true,
							name: true,
							price: true,
							description: true,
							categoryId: true,
							category: { select: { name: true } },
						},
					},
				},
				orderBy: { product: { name: "asc" } },
			});

			return c.json(inventory);
		},
	)
	// GET sales for a specific outlet
	.get(
		"/:id/sales",
		authMiddleware,
		describeRoute({
			tags: ["Outlets"],
			summary: "Get outlet sales",
			description: "Retrieve sales data for a specific outlet",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
				{
					name: "startDate",
					in: "query",
					required: false,
					schema: { type: "string", format: "date-time" },
				},
				{
					name: "endDate",
					in: "query",
					required: false,
					schema: { type: "string", format: "date-time" },
				},
				{
					name: "limit",
					in: "query",
					required: false,
					schema: { type: "integer", default: 20 },
				},
				{
					name: "offset",
					in: "query",
					required: false,
					schema: { type: "integer", default: 0 },
				},
			], */
			responses: {
				200: {
					description: "Outlet sales data",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									sales: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												totalAmount: { type: "number" },
												createdAt: {
													type: "string",
													format: "date-time",
												},
												status: { type: "string" },
											},
										},
									},
									total: { type: "number" },
									totalAmount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");
			const startDate = c.req.query("startDate");
			const endDate = c.req.query("endDate");
			const limit = Number.parseInt(c.req.query("limit") || "20");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify outlet exists
			const outlet = await db.outlet.findUnique({
				where: { id: outletId },
			});

			if (!outlet) {
				return c.json({ error: "Outlet not found" }, 404);
			}

			// Build query filter
			const where: any = { outletId };

			if (startDate && endDate) {
				where.createdAt = {
					gte: new Date(startDate),
					lte: new Date(endDate),
				};
			} else if (startDate) {
				where.createdAt = { gte: new Date(startDate) };
			} else if (endDate) {
				where.createdAt = { lte: new Date(endDate) };
			}

			// Get sales with pagination
			const [sales, total, totalAmountResult] = await Promise.all([
				db.sale.findMany({
					where,
					include: {
						customer: {
							select: { name: true, phone: true },
						},
						saleItems: {
							include: {
								product: {
									select: { name: true },
								},
							},
						},
					},
					orderBy: { createdAt: "desc" },
					skip: offset,
					take: limit,
				}),
				db.sale.count({ where }),
				db.sale.aggregate({
					where: { ...where, status: "COMPLETED" },
					_sum: { totalAmount: true },
				}),
			]);

			return c.json({
				sales,
				total,
				totalAmount: totalAmountResult._sum.totalAmount || 0,
			});
		},
	)
	// GET outlet statistics
	.get(
		"/:id/stats",
		authMiddleware,
		describeRoute({
			tags: ["Outlets"],
			summary: "Get outlet statistics",
			description: "Retrieve statistical data for a specific outlet",
			/* parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
			], */
			responses: {
				200: {
					description: "Outlet statistics",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									inventoryCount: { type: "number" },
									totalInventoryValue: { type: "number" },
									salesCount: { type: "number" },
									totalSalesAmount: { type: "number" },
									lowStockCount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Outlet not found",
				},
			},
		}),
		async (c) => {
			const outletId = c.req.param("id");

			// Verify outlet exists
			const outlet = await db.outlet.findUnique({
				where: { id: outletId },
				select: { organizationId: true },
			});

			if (!outlet) {
				return c.json({ error: "Outlet not found" }, 404);
			}

			// Get various statistics in parallel
			const [
				inventoryCount,
				inventoryItems,
				salesCount,
				totalSalesAmount,
				lowStockCount,
			] = await Promise.all([
				// Total inventory items count
				db.inventory.count({ where: { outletId } }),

				// All inventory items with products to calculate total value
				db.inventory.findMany({
					where: { outletId },
					include: {
						product: {
							select: { price: true },
						},
					},
				}),

				// Total sales count
				db.sale.count({
					where: {
						outletId,
						status: "COMPLETED",
					},
				}),

				// Total sales amount
				db.sale.aggregate({
					where: {
						outletId,
						status: "COMPLETED",
					},
					_sum: { totalAmount: true },
				}),

				// Count of low stock items (less than 10)
				db.inventory.count({
					where: {
						outletId,
						quantity: { lt: 10 },
					},
				}),
			]);

			// Calculate total inventory value
			const totalInventoryValue = inventoryItems.reduce((total, item) => {
				return total + item.quantity * (item.product?.price || 0);
			}, 0);

			return c.json({
				inventoryCount,
				totalInventoryValue,
				salesCount,
				totalSalesAmount: totalSalesAmount._sum.totalAmount || 0,
				lowStockCount,
			});
		},
	);
