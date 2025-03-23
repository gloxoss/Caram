import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const customerGroupsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
});

const customerGroupIdParamSchema = z.object({
	id: z.string().nonempty("Customer Group ID is required"),
});

const createCustomerGroupSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
});

const updateCustomerGroupSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
});

const addCustomersToGroupSchema = z.object({
	customerIds: z
		.array(z.string())
		.min(1, "At least one customer ID is required"),
});

export const customerGroupRouter = new Hono()
	.basePath("/customer-groups")
	// GET all customer groups
	.get(
		"/",
		authMiddleware,
		validator("query", customerGroupsQuerySchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "List all customer groups for an organization",
			description:
				"Retrieve a list of customer groups with optional search",
			responses: {
				200: {
					description: "List of customer groups",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									groups: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												description: { type: "string" },
												organizationId: {
													type: "string",
												},
												createdAt: {
													type: "string",
													format: "date-time",
												},
												updatedAt: {
													type: "string",
													format: "date-time",
												},
												_count: {
													type: "object",
													properties: {
														customers: {
															type: "number",
														},
													},
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
				},
			},
		}),
		async (c) => {
			const { organizationId, search } = c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add search if provided
			if (search) {
				where.name = { contains: search, mode: "insensitive" };
			}

			// Get customer groups with count of customers in each group
			const [groups, total] = await Promise.all([
				db.customerGroup.findMany({
					where,
					include: {
						_count: {
							select: {
								customers: true,
							},
						},
					},
					orderBy: { createdAt: "desc" },
				}),
				db.customerGroup.count({ where }),
			]);

			return c.json({ groups, total });
		},
	)
	// GET a single customer group by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", customerGroupIdParamSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Get customer group details",
			description:
				"Retrieve detailed information about a specific customer group",
			responses: {
				200: {
					description: "Customer group details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
									customerCount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Customer group not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const group = await db.customerGroup.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							customers: true,
						},
					},
				},
			});

			if (!group) {
				return c.json({ error: "Customer group not found" }, 404);
			}

			return c.json({
				...group,
				customerCount: group._count.customers,
			});
		},
	)
	// CREATE a new customer group
	.post(
		"/",
		authMiddleware,
		validator("json", createCustomerGroupSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Create a new customer group",
			description: "Create a new customer group for an organization",
			responses: {
				201: {
					description: "Customer group created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
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

			const group = await db.customerGroup.create({
				data,
			});

			return c.json(group, 201);
		},
	)
	// UPDATE a customer group
	.put(
		"/:id",
		authMiddleware,
		validator("param", customerGroupIdParamSchema),
		validator("json", updateCustomerGroupSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Update a customer group",
			description: "Update details of an existing customer group",
			responses: {
				200: {
					description: "Customer group updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
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
					description: "Customer group not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const group = await db.customerGroup.update({
					where: { id },
					data,
				});

				return c.json(group);
			} catch (error) {
				return c.json({ error: "Customer group not found" }, 404);
			}
		},
	)
	// DELETE a customer group
	.delete(
		"/:id",
		authMiddleware,
		validator("param", customerGroupIdParamSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Delete a customer group",
			description:
				"Delete an existing customer group (note: customers will not be deleted, just ungrouped)",
			responses: {
				200: {
					description: "Customer group deleted successfully",
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
					description: "Customer group not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Start a transaction to handle both removing the group ID from customers and deleting the group
				await db.$transaction(async (tx) => {
					// Update all customers in the group to have no group
					await tx.customer.updateMany({
						where: { groupId: id },
						data: { groupId: null },
					});

					// Delete the group
					await tx.customerGroup.delete({
						where: { id },
					});
				});

				return c.json({
					success: true,
					message: "Customer group deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Customer group not found" }, 404);
			}
		},
	)
	// GET customers in a group
	.get(
		"/:id/customers",
		authMiddleware,
		validator("param", customerGroupIdParamSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Get customers in a group",
			description: "Retrieve all customers belonging to a specific group",
			responses: {
				200: {
					description: "Customers in the group",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									customers: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												email: { type: "string" },
												phone: { type: "string" },
												address: { type: "string" },
												organizationId: {
													type: "string",
												},
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
				404: {
					description: "Customer group not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "20");
			const offset = Number.parseInt(c.req.query("offset") || "0");
			const search = c.req.query("search");

			// Verify group exists
			const group = await db.customerGroup.findUnique({
				where: { id },
			});

			if (!group) {
				return c.json({ error: "Customer group not found" }, 404);
			}

			// Build where clause
			const where: any = { groupId: id };

			// Add search if provided
			if (search) {
				where.OR = [
					{ name: { contains: search, mode: "insensitive" } },
					{ email: { contains: search, mode: "insensitive" } },
					{ phone: { contains: search, mode: "insensitive" } },
				];
			}

			// Get customers in the group with pagination
			const [customers, total] = await Promise.all([
				db.customer.findMany({
					where,
					orderBy: { name: "asc" },
					take: limit,
					skip: offset,
				}),
				db.customer.count({ where }),
			]);

			return c.json({ customers, total });
		},
	)
	// ADD customers to a group
	.post(
		"/:id/customers",
		authMiddleware,
		validator("param", customerGroupIdParamSchema),
		validator("json", addCustomersToGroupSchema),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Add customers to a group",
			description: "Add one or more customers to a specific group",
			responses: {
				200: {
					description: "Customers added to group successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
									updatedCount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Customer group not found",
				},
				400: {
					description: "Invalid input",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const { customerIds } = c.req.valid("json");

			// Verify group exists
			const group = await db.customerGroup.findUnique({
				where: { id },
			});

			if (!group) {
				return c.json({ error: "Customer group not found" }, 404);
			}

			// Update all specified customers to be in this group
			const result = await db.customer.updateMany({
				where: {
					id: { in: customerIds },
					organizationId: group.organizationId, // Ensure customers belong to the same organization
				},
				data: {
					groupId: id,
				},
			});

			return c.json({
				success: true,
				message: `${result.count} customers added to group`,
				updatedCount: result.count,
			});
		},
	)
	// REMOVE a customer from a group
	.delete(
		"/:id/customers/:customerId",
		authMiddleware,
		validator(
			"param",
			z.object({
				id: z.string().nonempty("Customer Group ID is required"),
				customerId: z.string().nonempty("Customer ID is required"),
			}),
		),
		describeRoute({
			tags: ["Customer Groups"],
			summary: "Remove a customer from a group",
			description: "Remove a specific customer from a group",
			responses: {
				200: {
					description: "Customer removed from group successfully",
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
					description: "Customer or group not found",
				},
			},
		}),
		async (c) => {
			const { id, customerId } = c.req.valid("param");

			try {
				// Update the customer to remove the group
				await db.customer.update({
					where: {
						id: customerId,
						groupId: id, // Ensure customer is in this group
					},
					data: {
						groupId: null,
					},
				});

				return c.json({
					success: true,
					message: "Customer removed from group",
				});
			} catch (error) {
				return c.json({ error: "Customer or group not found" }, 404);
			}
		},
	);
