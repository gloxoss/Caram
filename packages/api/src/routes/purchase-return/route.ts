import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const purchaseReturnsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	purchaseId: z.string().optional(),
	reason: z.string().optional(),
	amount: z.coerce.number().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const purchaseReturnIdParamSchema = z.object({
	id: z.string().nonempty("Purchase Return ID is required"),
});

const createPurchaseReturnSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	purchaseId: z.string().nonempty("Purchase ID is required"),
	reason: z.string().nonempty("Reason is required"),
	amount: z.number().positive("Amount is required"),
});

const updatePurchaseReturnSchema = z.object({
	purchaseId: z.string().optional(),
	reason: z.string().optional(),
	amount: z.number().positive().optional(),
});

export const purchaseReturnRouter = new Hono()
	.basePath("/purchase-returns")
	// GET all purchase returns
	.get(
		"/",
		authMiddleware,
		validator("query", purchaseReturnsQuerySchema),
		describeRoute({
			tags: ["Purchase Returns"],
			summary: "List all purchase returns for an organization",
			description:
				"Retrieve a list of purchase returns with optional filtering",
			responses: {
				200: {
					description: "List of purchase returns",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									purchaseReturns: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												purchaseId: { type: "string" },
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
			const {
				organizationId,
				purchaseId,
				reason,
				amount,
				limit,
				offset,
			} = c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add purchaseId filter if provided
			if (purchaseId) {
				where.purchaseId = purchaseId;
			}

			// Add reason filter if provided
			if (reason) {
				where.reason = { contains: reason, mode: "insensitive" };
			}

			// Add amount filter if provided
			if (amount) {
				where.amount = amount;
			}

			// Get purchase returns with pagination
			const [purchaseReturns, total] = await Promise.all([
				db.purchaseReturn.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
				}),
				db.purchaseReturn.count({ where }),
			]);

			return c.json({ purchaseReturns, total });
		},
	)
	// GET a single purchase return by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", purchaseReturnIdParamSchema),
		describeRoute({
			tags: ["Purchase Returns"],
			summary: "Get purchase return details",
			description:
				"Retrieve detailed information about a specific purchase return",
			responses: {
				200: {
					description: "Purchase return details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									purchaseId: { type: "string" },
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
					description: "Purchase return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const purchaseReturn = await db.purchaseReturn.findUnique({
				where: { id },
			});

			if (!purchaseReturn) {
				return c.json({ error: "Purchase return not found" }, 404);
			}

			return c.json(purchaseReturn);
		},
	)
	// CREATE a new purchase return
	.post(
		"/",
		authMiddleware,
		validator("json", createPurchaseReturnSchema),
		describeRoute({
			tags: ["Purchase Returns"],
			summary: "Create a new purchase return",
			description:
				"Create a new purchase return associated with an organization and purchase",
			responses: {
				201: {
					description: "Purchase return created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									purchaseId: { type: "string" },
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
					description: "Purchase not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify purchase exists
			const purchase = await db.purchaseOrg.findUnique({
				where: {
					id: data.purchaseId,
					organizationId: data.organizationId,
				},
			});

			if (!purchase) {
				return c.json({ error: "Purchase not found" }, 404);
			}

			const purchaseReturn = await db.purchaseReturn.create({
				data: {
					organizationId: data.organizationId,
					purchaseId: data.purchaseId,
					reason: data.reason,
					amount: data.amount,
				},
			});

			return c.json(purchaseReturn, 201);
		},
	)
	// UPDATE a purchase return
	.put(
		"/:id",
		authMiddleware,
		validator("param", purchaseReturnIdParamSchema),
		validator("json", updatePurchaseReturnSchema),
		describeRoute({
			tags: ["Purchase Returns"],
			summary: "Update a purchase return",
			description: "Update details of an existing purchase return",
			responses: {
				200: {
					description: "Purchase return updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									purchaseId: { type: "string" },
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
					description: "Purchase return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const purchaseReturn = await db.purchaseReturn.update({
					where: { id },
					data,
				});

				return c.json(purchaseReturn);
			} catch (error) {
				return c.json({ error: "Purchase return not found" }, 404);
			}
		},
	)
	// DELETE a purchase return
	.delete(
		"/:id",
		authMiddleware,
		validator("param", purchaseReturnIdParamSchema),
		describeRoute({
			tags: ["Purchase Returns"],
			summary: "Delete a purchase return",
			description: "Delete an existing purchase return",
			responses: {
				200: {
					description: "Purchase return deleted successfully",
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
					description: "Purchase return not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.purchaseReturn.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Purchase return deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Purchase return not found" }, 404);
			}
		},
	);
