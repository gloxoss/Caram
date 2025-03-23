import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const warrantiesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	productId: z.string().optional(),
	duration: z.coerce.number().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const warrantyIdParamSchema = z.object({
	id: z.string().nonempty("Warranty ID is required"),
});

const createWarrantySchema = z
	.object({
		organizationId: z.string().nonempty("Organization ID is required"),
		productId: z.string().nonempty("Product ID is required"),
		duration: z
			.number()
			.int()
			.positive("Duration must be a positive integer"),
		startDate: z.coerce.date(),
	})
	.transform((data) => ({
		...data,
		endDate: new Date(
			data.startDate.getTime() + data.duration * 30 * 24 * 60 * 60 * 1000,
		), // duration in months to milliseconds
	}));

const updateWarrantySchema = z.object({
	productId: z.string().optional(),
	duration: z.number().int().positive().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

export const warrantyRouter = new Hono()
	.basePath("/warranties")
	// GET all warranties
	.get(
		"/",
		authMiddleware,
		validator("query", warrantiesQuerySchema),
		describeRoute({
			tags: ["Warranties"],
			summary: "List all warranties for an organization",
			description:
				"Retrieve a list of warranties with optional filtering",
			responses: {
				200: {
					description: "List of warranties",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									warranties: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												productId: {
													type: "string",
												},
												duration: {
													type: "number",
												},
												startDate: {
													type: "string",
													format: "date-time",
												},
												endDate: {
													type: "string",
													format: "date-time",
												},
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
									total: { type: "number" },
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
			const {
				organizationId,
				productId,
				duration,
				startDate,
				endDate,
				limit,
				offset,
			} = c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add productId filter if provided
			if (productId) {
				where.productId = productId;
			}

			// Add duration filter if provided
			if (duration) {
				where.duration = duration;
			}

			// Add startDate filter if provided
			if (startDate) {
				where.startDate = {
					gte: startDate,
				};
			}

			// Add endDate filter if provided
			if (endDate) {
				where.endDate = {
					lte: endDate,
				};
			}

			// Get warranties with pagination
			const [warranties, total] = await Promise.all([
				db.warranty.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
					include: {
						product: true,
					},
				}),
				db.warranty.count({ where }),
			]);

			return c.json({ warranties, total });
		},
	)
	// GET a single warranty by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", warrantyIdParamSchema),
		describeRoute({
			tags: ["Warranties"],
			summary: "Get warranty details",
			description:
				"Retrieve detailed information about a specific warranty",
			responses: {
				200: {
					description: "Warranty details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									productId: { type: "string" },
									duration: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
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
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const warranty = await db.warranty.findUnique({
				where: { id },
				include: {
					product: true,
				},
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			return c.json(warranty);
		},
	)
	// CREATE a new warranty
	.post(
		"/",
		authMiddleware,
		validator("json", createWarrantySchema),
		describeRoute({
			tags: ["Warranties"],
			summary: "Create a new warranty",
			description:
				"Create a new warranty for a product with specified duration",
			responses: {
				201: {
					description: "Warranty created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									productId: { type: "string" },
									duration: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
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
				404: {
					description: "Product not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify product exists and belongs to the organization
			const product = await db.product.findUnique({
				where: {
					id: data.productId,
					organizationId: data.organizationId,
				},
			});

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			// Create the warranty
			const warranty = await db.warranty.create({
				data: {
					organizationId: data.organizationId,
					productId: data.productId,
					duration: data.duration,
					startDate: data.startDate,
					endDate: data.endDate,
				},
				include: {
					product: true,
				},
			});

			return c.json(warranty, 201);
		},
	)
	// UPDATE a warranty
	.put(
		"/:id",
		authMiddleware,
		validator("param", warrantyIdParamSchema),
		validator("json", updateWarrantySchema),
		describeRoute({
			tags: ["Warranties"],
			summary: "Update a warranty",
			description: "Update details of an existing warranty",
			responses: {
				200: {
					description: "Warranty updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									productId: { type: "string" },
									duration: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
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
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// If duration or startDate is updated, recalculate endDate
			const updateData = { ...data };
			if (data.duration || data.startDate) {
				const currentWarranty = await db.warranty.findUnique({
					where: { id },
				});

				if (!currentWarranty) {
					return c.json({ error: "Warranty not found" }, 404);
				}

				const newDuration = data.duration || currentWarranty.duration;
				const newStartDate =
					data.startDate || currentWarranty.startDate;

				updateData.endDate = new Date(
					newStartDate.getTime() +
						newDuration * 30 * 24 * 60 * 60 * 1000,
				);
			}

			try {
				const warranty = await db.warranty.update({
					where: { id },
					data: updateData,
					include: {
						product: true,
					},
				});

				return c.json(warranty);
			} catch (error) {
				return c.json({ error: "Warranty not found" }, 404);
			}
		},
	)
	// DELETE a warranty
	.delete(
		"/:id",
		authMiddleware,
		validator("param", warrantyIdParamSchema),
		describeRoute({
			tags: ["Warranties"],
			summary: "Delete a warranty",
			description: "Delete an existing warranty",
			responses: {
				200: {
					description: "Warranty deleted successfully",
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
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.warranty.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Warranty deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Warranty not found" }, 404);
			}
		},
	);
