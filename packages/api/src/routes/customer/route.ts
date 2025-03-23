import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const customersQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	groupId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const customerIdParamSchema = z.object({
	id: z.string().nonempty("Customer ID is required"),
});

const createCustomerSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	groupId: z.string().optional(),
});

const updateCustomerSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	groupId: z.string().optional(),
});

export const customerRouter = new Hono()
	.basePath("/customers")
	// GET all customers
	.get(
		"/",
		authMiddleware,
		validator("query", customersQuerySchema),
		describeRoute({
			tags: ["Customers"],
			summary: "List all customers for an organization",
			description:
				"Retrieve a list of customers with optional filtering by group and search term",
			responses: {
				200: {
					description: "List of customers",
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
												groupId: { type: "string" },
												group: {
													type: "object",
													properties: {
														id: { type: "string" },
														name: {
															type: "string",
														},
													},
												},
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
			const { organizationId, search, groupId, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add group filter if provided
			if (groupId) {
				where.groupId = groupId;
			}

			// Add search if provided
			if (search) {
				where.OR = [
					{ name: { contains: search, mode: "insensitive" } },
					{ email: { contains: search, mode: "insensitive" } },
					{ phone: { contains: search, mode: "insensitive" } },
				];
			}

			// Get customers with pagination
			const [customers, total] = await Promise.all([
				db.customer.findMany({
					where,
					include: {
						group: {
							select: {
								id: true,
								name: true,
							},
						},
					},
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
				}),
				db.customer.count({ where }),
			]);

			return c.json({ customers, total });
		},
	)
	// GET a single customer by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", customerIdParamSchema),
		describeRoute({
			tags: ["Customers"],
			summary: "Get customer details",
			description:
				"Retrieve detailed information about a specific customer",
			responses: {
				200: {
					description: "Customer details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									email: { type: "string" },
									phone: { type: "string" },
									address: { type: "string" },
									groupId: { type: "string" },
									group: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
										},
									},
									organizationId: { type: "string" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
									salesCount: { type: "number" },
									totalSpend: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Customer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const customer = await db.customer.findUnique({
				where: { id },
				include: {
					group: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});

			if (!customer) {
				return c.json({ error: "Customer not found" }, 404);
			}

			// Get additional stats
			const [salesCount, totalSpendResult] = await Promise.all([
				db.sale.count({
					where: {
						customerId: id,
						status: "COMPLETED",
					},
				}),
				db.sale.aggregate({
					where: {
						customerId: id,
						status: "COMPLETED",
					},
					_sum: { totalAmount: true },
				}),
			]);

			return c.json({
				...customer,
				salesCount,
				totalSpend: totalSpendResult._sum.totalAmount || 0,
			});
		},
	)
	// CREATE a new customer
	.post(
		"/",
		authMiddleware,
		validator("json", createCustomerSchema),
		describeRoute({
			tags: ["Customers"],
			summary: "Create a new customer",
			description:
				"Create a new customer associated with an organization",
			responses: {
				201: {
					description: "Customer created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									email: { type: "string" },
									phone: { type: "string" },
									address: { type: "string" },
									groupId: { type: "string" },
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

			const customer = await db.customer.create({
				data,
			});

			return c.json(customer, 201);
		},
	)
	// UPDATE a customer
	.put(
		"/:id",
		authMiddleware,
		validator("param", customerIdParamSchema),
		validator("json", updateCustomerSchema),
		describeRoute({
			tags: ["Customers"],
			summary: "Update a customer",
			description: "Update details of an existing customer",
			responses: {
				200: {
					description: "Customer updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									email: { type: "string" },
									phone: { type: "string" },
									address: { type: "string" },
									groupId: { type: "string" },
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
					description: "Customer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const customer = await db.customer.update({
					where: { id },
					data,
				});

				return c.json(customer);
			} catch (error) {
				return c.json({ error: "Customer not found" }, 404);
			}
		},
	)
	// DELETE a customer
	.delete(
		"/:id",
		authMiddleware,
		validator("param", customerIdParamSchema),
		describeRoute({
			tags: ["Customers"],
			summary: "Delete a customer",
			description:
				"Delete an existing customer (will fail if customer has associated sales)",
			responses: {
				200: {
					description: "Customer deleted successfully",
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
					description: "Cannot delete customer with associated data",
				},
				404: {
					description: "Customer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Check if customer has associated sales
				const salesCount = await db.sale.count({
					where: { customerId: id },
				});

				if (salesCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete customer with associated sales data",
						},
						400,
					);
				}

				await db.customer.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Customer deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Customer not found" }, 404);
			}
		},
	)
	// GET customer purchase history
	.get(
		"/:id/sales",
		authMiddleware,
		validator("param", customerIdParamSchema),
		describeRoute({
			tags: ["Customers"],
			summary: "Get customer purchase history",
			description: "Retrieve sales history for a specific customer",
			responses: {
				200: {
					description: "Customer sales history",
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
												outlet: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
													},
												},
												saleItems: {
													type: "array",
													items: {
														type: "object",
														properties: {
															quantity: {
																type: "number",
															},
															price: {
																type: "number",
															},
															product: {
																type: "object",
																properties: {
																	name: {
																		type: "string",
																	},
																},
															},
														},
													},
												},
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
					description: "Customer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "10");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify customer exists
			const customer = await db.customer.findUnique({
				where: { id },
			});

			if (!customer) {
				return c.json({ error: "Customer not found" }, 404);
			}

			// Get sales with pagination
			const [sales, total, totalAmountResult] = await Promise.all([
				db.sale.findMany({
					where: {
						customerId: id,
					},
					include: {
						outlet: {
							select: { name: true },
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
					take: limit,
					skip: offset,
				}),
				db.sale.count({
					where: { customerId: id },
				}),
				db.sale.aggregate({
					where: {
						customerId: id,
						status: "COMPLETED",
					},
					_sum: { totalAmount: true },
				}),
			]);

			return c.json({
				sales,
				total,
				totalAmount: totalAmountResult._sum.totalAmount || 0,
			});
		},
	);
