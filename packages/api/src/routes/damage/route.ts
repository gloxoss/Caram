import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// Query schema for listing damaged items
const damageQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	productId: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
	search: z.string().optional(),
});

// Schema for creating a damaged item report
const createDamageSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().positive("Quantity must be positive"),
	reason: z.string().nonempty("Reason is required"),
});

// Schema for updating a damaged item report
const updateDamageSchema = z.object({
	quantity: z.number().positive("Quantity must be positive").optional(),
	reason: z.string().optional(),
});

export const damageRouter = new Hono()
	.basePath("/damages")
	// GET all damaged items
	.get(
		"/",
		authMiddleware,
		validator("query", damageQuerySchema),
		describeRoute({
			tags: ["Damage"],
			summary: "List damaged items",
			description:
				"Retrieve a list of damaged inventory items with optional filtering",
			responses: {
				200: {
					description: "List of damaged items",
				},
			},
		}),
		async (c) => {
			const { organizationId, productId, fromDate, toDate, search } =
				c.req.valid("query");

			// Build the where clause
			const where: any = {
				organizationId,
				...(productId && { productId }),
			};

			// Add date filtering if specified
			if (fromDate || toDate) {
				const dateFilter: any = {};
				if (fromDate) {
					dateFilter.gte = new Date(fromDate);
				}
				if (toDate) {
					dateFilter.lte = new Date(toDate);
				}
				where.createdAt = dateFilter;
			}

			// Add search functionality
			const searchWhere = search
				? {
						OR: [
							{
								reason: {
									contains: search,
									mode: "insensitive",
								},
							},
							{
								product: {
									name: {
										contains: search,
										mode: "insensitive",
									},
								},
							},
						],
					}
				: {};

			try {
				const damages = await db.damage.findMany({
					where: {
						...where,
						...searchWhere,
					},
					orderBy: { createdAt: "desc" },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				// Calculate totals and statistics
				const totalItems = damages.length;
				const totalDamagedQuantity = damages.reduce(
					(total, item) => total + item.quantity,
					0,
				);

				return c.json({
					items: damages,
					meta: {
						totalItems,
						totalDamagedQuantity,
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damaged items",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a specific damaged item by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Damage"],
			summary: "Get damaged item details",
			description:
				"Retrieve detailed information about a specific damaged item",
			responses: {
				200: {
					description: "Damaged item details",
				},
				404: {
					description: "Damaged item not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");

			try {
				const damage = await db.damage.findUnique({
					where: { id: damageId },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								description: true,
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				if (!damage) {
					return c.json({ error: "Damaged item not found" }, 404);
				}

				return c.json(damage);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damaged item",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new damaged item report
	.post(
		"/",
		authMiddleware,
		validator("json", createDamageSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Report damaged item",
			description: "Create a new damaged inventory report",
			responses: {
				201: {
					description: "Damaged item reported successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			// Get user ID from context if available
			const userId = c.get("user")?.id ?? "unknown";

			try {
				// Validate product exists
				const product = await db.product.findUnique({
					where: { id: data.productId },
				});

				if (!product) {
					return c.json({ error: "Product not found" }, 404);
				}

				// Create the damage report
				const damageReport = await db.damage.create({
					data: {
						organizationId: data.organizationId,
						productId: data.productId,
						quantity: data.quantity,
						reason: data.reason,
					},
					include: {
						product: {
							select: {
								id: true,
								name: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json(damageReport, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to report damaged item",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a damage report
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateDamageSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Update damaged item",
			description: "Update details of an existing damage report",
			responses: {
				200: {
					description: "Damage report updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Damaged item not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if damage report exists
			const existingDamage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!existingDamage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Check if trying to update quantity to more than original
			if (data.quantity && data.quantity > existingDamage.quantity) {
				return c.json(
					{
						error: "Cannot increase damaged quantity in an existing report",
						originalQuantity: existingDamage.quantity,
						requestedQuantity: data.quantity,
					},
					400,
				);
			}

			try {
				// Update the damage report
				const updatedDamage = await db.damage.update({
					where: { id: damageId },
					data: {
						quantity: data.quantity,
						reason: data.reason,
					},
					include: {
						product: {
							select: {
								id: true,
								name: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json(updatedDamage);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update damage report",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a damage report
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Damage"],
			summary: "Delete damage report",
			description: "Delete a damage report",
			responses: {
				200: {
					description: "Damage report deleted successfully",
				},
				404: {
					description: "Damage report not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");

			// Check if damage report exists
			const damage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!damage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			try {
				// Delete the damage report
				await db.damage.delete({
					where: { id: damageId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete damage report",
						details: error,
					},
					400,
				);
			}
		},
	)
	// GET damage statistics
	.get(
		"/stats",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				fromDate: z.string().optional(),
				toDate: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Damage"],
			summary: "Get damage statistics",
			description: "Get statistics about damaged inventory for reporting",
			responses: {
				200: {
					description: "Damage statistics",
				},
			},
		}),
		async (c) => {
			const { organizationId, fromDate, toDate } = c.req.valid("query");

			const where: any = {
				organizationId,
			};

			if (fromDate || toDate) {
				const dateFilter: any = {};
				if (fromDate) {
					dateFilter.gte = new Date(fromDate);
				}
				if (toDate) {
					dateFilter.lte = new Date(toDate);
				}
				where.createdAt = dateFilter;
			}

			try {
				// Get total damages
				const totalDamages = await db.damage.aggregate({
					where,
					_sum: {
						quantity: true,
					},
					_count: {
						id: true,
					},
				});

				// Get top 5 most frequently damaged products
				const topDamagedProducts = await db.damage.groupBy({
					by: ["productId"],
					where,
					_count: {
						id: true,
					},
					_sum: {
						quantity: true,
					},
					orderBy: {
						_sum: {
							quantity: "desc",
						},
					},
					take: 5,
				});

				// Get product details for top damaged products
				const productIds = topDamagedProducts.map(
					(item) => item.productId,
				);
				const productDetails = await db.product.findMany({
					where: {
						id: {
							in: productIds,
						},
					},
					select: {
						id: true,
						name: true,
					},
				});

				// Map product details to the top damaged products
				const topProducts = topDamagedProducts.map((item) => {
					const product = productDetails.find(
						(p) => p.id === item.productId,
					);
					return {
						productId: item.productId,
						productName: product?.name || "Unknown",
						count: item._count.id,
						quantity: item._sum.quantity,
					};
				});

				// Format the results
				return c.json({
					totals: {
						count: totalDamages._count.id,
						quantity: totalDamages._sum.quantity || 0,
					},
					topDamagedProducts: topProducts,
					period: {
						from: fromDate ? new Date(fromDate) : null,
						to: toDate ? new Date(toDate) : null,
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damage statistics",
						details: error,
					},
					500,
				);
			}
		},
	);
