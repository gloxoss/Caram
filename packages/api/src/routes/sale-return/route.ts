import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const saleReturnsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	saleId: z.string().optional(),
	reason: z.string().optional(),
	amount: z.coerce.number().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const saleReturnIdParamSchema = z.object({
	id: z.string().nonempty("Sale Return ID is required"),
});

const createSaleReturnSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	saleId: z.string().nonempty("Sale ID is required"),
	reason: z.string().nonempty("Reason is required"),
	amount: z.number().positive("Amount is required"),
});

const updateSaleReturnSchema = z.object({
	saleId: z.string().optional(),
	reason: z.string().optional(),
	amount: z.number().positive().optional(),
});

export const saleReturnRouter = new Hono()
	.basePath("/sale-returns")
	// GET all sale returns
	.get(
		"/",
		authMiddleware,
		validator("query", saleReturnsQuerySchema),
		describeRoute({
			tags: ["Sale Returns"],
			summary: "List all sale returns for an organization",
			description:
				"Retrieve a list of sale returns with optional filtering",
			responses: {
				200: {
					description: "List of sale returns",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									saleReturns: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												saleId: { type: "string" },
												reason: { type: "string" },
												amount: { type: "number" },
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
			const { organizationId, saleId, reason, amount, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add saleId filter if provided
			if (saleId) {
				where.saleId = saleId;
			}

			// Add reason filter if provided
			if (reason) {
				where.reason = { contains: reason, mode: "insensitive" };
			}

			// Add amount filter if provided
			if (amount) {
				where.amount = amount;
			}

			// Get sale returns with pagination
			const [saleReturns, total] = await Promise.all([
				db.saleReturn.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
				}),
				db.saleReturn.count({ where }),
			]);

			return c.json({ saleReturns, total });
		},
	)
	// GET a single sale return by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", saleReturnIdParamSchema),
		describeRoute({
			tags: ["Sale Returns"],
			summary: "Get sale return details",
			description:
				"Retrieve detailed information about a specific sale return",
			responses: {
				200: {
					description: "Sale return details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									saleId: { type: "string" },
									reason: { type: "string" },
									amount: { type: "number" },
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
					description: "Sale return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const saleReturn = await db.saleReturn.findUnique({
				where: { id },
			});

			if (!saleReturn) {
				return c.json({ error: "Sale return not found" }, 404);
			}

			return c.json(saleReturn);
		},
	)
	// CREATE a new sale return
	.post(
		"/",
		authMiddleware,
		validator("json", createSaleReturnSchema),
		describeRoute({
			tags: ["Sale Returns"],
			summary: "Create a new sale return",
			description:
				"Create a new sale return associated with an organization and sale",
			responses: {
				201: {
					description: "Sale return created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									saleId: { type: "string" },
									reason: { type: "string" },
									amount: { type: "number" },
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
					description: "Sale not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify sale exists
			const sale = await db.sale.findUnique({
				where: {
					id: data.saleId,
					organizationId: data.organizationId,
				},
			});

			if (!sale) {
				return c.json({ error: "Sale not found" }, 404);
			}

			const saleReturn = await db.saleReturn.create({
				data: {
					organizationId: data.organizationId,
					saleId: data.saleId,
					reason: data.reason,
					amount: data.amount,
				},
			});

			return c.json(saleReturn, 201);
		},
	)
	// UPDATE a sale return
	.put(
		"/:id",
		authMiddleware,
		validator("param", saleReturnIdParamSchema),
		validator("json", updateSaleReturnSchema),
		describeRoute({
			tags: ["Sale Returns"],
			summary: "Update a sale return",
			description: "Update details of an existing sale return",
			responses: {
				200: {
					description: "Sale return updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									saleId: { type: "string" },
									reason: { type: "string" },
									amount: { type: "number" },
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
					description: "Sale return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const saleReturn = await db.saleReturn.update({
					where: { id },
					data,
				});

				return c.json(saleReturn);
			} catch (error) {
				return c.json({ error: "Sale return not found" }, 404);
			}
		},
	)
	// DELETE a sale return
	.delete(
		"/:id",
		authMiddleware,
		validator("param", saleReturnIdParamSchema),
		describeRoute({
			tags: ["Sale Returns"],
			summary: "Delete a sale return",
			description: "Delete an existing sale return",
			responses: {
				200: {
					description: "Sale return deleted successfully",
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
					description: "Sale return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.saleReturn.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Sale return deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Sale return not found" }, 404);
			}
		},
	);
