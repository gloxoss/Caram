import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const suppliersQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const supplierIdParamSchema = z.object({
	id: z.string().nonempty("Supplier ID is required"),
});

const createSupplierSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	contact: z.string().optional(),
	address: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	website: z.string().url().optional(),
	notes: z.string().optional(),
	creditLimit: z.number().min(0).optional(),
	paymentTerms: z.string().optional(),
	taxId: z.string().optional(),
});

const updateSupplierSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	contact: z.string().optional(),
	address: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	website: z.string().url().optional(),
	notes: z.string().optional(),
	creditLimit: z.number().min(0).optional(),
	paymentTerms: z.string().optional(),
	taxId: z.string().optional(),
});

const createSupplierPaymentSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	supplierId: z.string().nonempty("Supplier ID is required"),
	amount: z.number().gt(0, "Amount must be greater than 0"),
	date: z.string().datetime().optional(),
	referenceNumber: z.string().optional(),
	notes: z.string().optional(),
	paymentMethod: z.string().optional(),
});

// === Router Definition ===
export const supplierRouter = new Hono()
	.basePath("/suppliers")
	// GET all suppliers
	.get(
		"/",
		authMiddleware,
		validator("query", suppliersQuerySchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "List all suppliers for an organization",
			description:
				"Retrieve a list of suppliers with optional filtering by search term",
			responses: {
				200: {
					description: "List of suppliers",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									suppliers: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												contact: { type: "string" },
												address: { type: "string" },
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
					description: "Invalid or missing parameters",
				},
			},
		}),
		async (c) => {
			const { organizationId, search, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: Prisma.SupplierWhereInput = { organizationId };

			// Add search if provided
			if (search) {
				where.OR = [
					{ name: { contains: search, mode: "insensitive" } },
					{ contact: { contains: search, mode: "insensitive" } },
					{ address: { contains: search, mode: "insensitive" } },
				];
			}

			// Get suppliers with pagination
			const [suppliers, total] = await Promise.all([
				db.supplier.findMany({
					where,
					orderBy: { name: "asc" },
					take: limit,
					skip: offset,
				}),
				db.supplier.count({ where }),
			]);

			return c.json({ suppliers, total });
		},
	)
	// GET a single supplier by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Get supplier details",
			description:
				"Retrieve detailed information about a specific supplier",
			responses: {
				200: {
					description: "Supplier details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									contact: { type: "string" },
									address: { type: "string" },
									organizationId: { type: "string" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
									purchaseCount: { type: "number" },
									totalPurchases: { type: "number" },
									totalPayments: { type: "number" },
									balance: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const supplier = await db.supplier.findUnique({
				where: { id },
			});

			if (!supplier) {
				return c.json({ error: "Supplier not found" }, 404);
			}

			// Get additional statistics about the supplier
			const [purchaseCount, totalPurchases, totalPayments] =
				await Promise.all([
					db.purchaseOrg.count({
						where: { supplierId: id },
					}),
					db.purchaseOrg.aggregate({
						where: { supplierId: id },
						_sum: { totalAmount: true },
					}),
					db.supplierPayment.aggregate({
						where: { supplierId: id },
						_sum: { amount: true },
					}),
				]);

			// Calculate balance (amount owed to supplier)
			const totalPurchaseAmount = totalPurchases._sum.totalAmount || 0;
			const totalPaymentAmount = totalPayments._sum.amount || 0;
			const balance = totalPurchaseAmount - totalPaymentAmount;

			return c.json({
				...supplier,
				purchaseCount,
				totalPurchases: totalPurchaseAmount,
				totalPayments: totalPaymentAmount,
				balance,
			});
		},
	)
	// CREATE a new supplier
	.post(
		"/",
		authMiddleware,
		validator("json", createSupplierSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Create a new supplier",
			description: "Create a new supplier for an organization",
			responses: {
				201: {
					description: "Supplier created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									contact: { type: "string" },
									address: { type: "string" },
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

			// Extract fields that are in the schema but not in the database model
			const {
				email,
				phone,
				website,
				notes,
				creditLimit,
				paymentTerms,
				taxId,
				...supplierData
			} = data;

			// Create the supplier
			const supplier = await db.supplier.create({
				data: supplierData,
			});

			return c.json(supplier, 201);
		},
	)
	// UPDATE a supplier
	.put(
		"/:id",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		validator("json", updateSupplierSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Update a supplier",
			description: "Update details of an existing supplier",
			responses: {
				200: {
					description: "Supplier updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									contact: { type: "string" },
									address: { type: "string" },
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
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Extract fields that are in the schema but not in the database model
			const {
				email,
				phone,
				website,
				notes,
				creditLimit,
				paymentTerms,
				taxId,
				...supplierData
			} = data;

			try {
				const supplier = await db.supplier.update({
					where: { id },
					data: supplierData,
				});

				return c.json(supplier);
			} catch (error) {
				return c.json({ error: "Supplier not found" }, 404);
			}
		},
	)
	// DELETE a supplier
	.delete(
		"/:id",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Delete a supplier",
			description:
				"Delete an existing supplier (will fail if supplier has associated data)",
			responses: {
				200: {
					description: "Supplier deleted successfully",
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
					description: "Cannot delete supplier with associated data",
				},
				404: {
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Check if supplier has associated purchases or payments
				const [purchaseCount, paymentCount] = await Promise.all([
					db.purchaseOrg.count({ where: { supplierId: id } }),
					db.supplierPayment.count({ where: { supplierId: id } }),
				]);

				if (purchaseCount > 0 || paymentCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete supplier with associated purchases or payments",
						},
						400,
					);
				}

				await db.supplier.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Supplier deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Supplier not found" }, 404);
			}
		},
	)
	// GET purchases for a specific supplier
	.get(
		"/:id/purchases",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Get supplier purchases",
			description: "Retrieve purchase history for a specific supplier",
			responses: {
				200: {
					description: "Supplier purchase history",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									purchases: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
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
									totalAmount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "20");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify supplier exists
			const supplier = await db.supplier.findUnique({
				where: { id },
			});

			if (!supplier) {
				return c.json({ error: "Supplier not found" }, 404);
			}

			// Get purchases with pagination
			const [purchases, total, totalAmountResult] = await Promise.all([
				db.purchaseOrg.findMany({
					where: { supplierId: id },
					orderBy: { createdAt: "desc" },
					skip: offset,
					take: limit,
				}),
				db.purchaseOrg.count({ where: { supplierId: id } }),
				db.purchaseOrg.aggregate({
					where: { supplierId: id },
					_sum: { totalAmount: true },
				}),
			]);

			return c.json({
				purchases,
				total,
				totalAmount: totalAmountResult._sum.totalAmount || 0,
			});
		},
	)
	// GET payments for a specific supplier
	.get(
		"/:id/payments",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Get supplier payments",
			description: "Retrieve payment history for a specific supplier",
			responses: {
				200: {
					description: "Supplier payment history",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									payments: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												amount: { type: "number" },
												createdAt: {
													type: "string",
													format: "date-time",
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
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "20");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify supplier exists
			const supplier = await db.supplier.findUnique({
				where: { id },
			});

			if (!supplier) {
				return c.json({ error: "Supplier not found" }, 404);
			}

			// Get payments with pagination
			const [payments, total, totalAmountResult] = await Promise.all([
				db.supplierPayment.findMany({
					where: { supplierId: id },
					orderBy: { createdAt: "desc" },
					skip: offset,
					take: limit,
				}),
				db.supplierPayment.count({ where: { supplierId: id } }),
				db.supplierPayment.aggregate({
					where: { supplierId: id },
					_sum: { amount: true },
				}),
			]);

			return c.json({
				payments,
				total,
				totalAmount: totalAmountResult._sum.amount || 0,
			});
		},
	)
	// CREATE a payment for a supplier
	.post(
		"/:id/payments",
		authMiddleware,
		validator("param", supplierIdParamSchema),
		validator("json", createSupplierPaymentSchema),
		describeRoute({
			tags: ["Suppliers"],
			summary: "Create supplier payment",
			description: "Record a payment made to a supplier",
			responses: {
				201: {
					description: "Payment created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									supplierId: { type: "string" },
									amount: { type: "number" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
								},
							},
						},
					},
				},
				404: {
					description: "Supplier not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Verify supplier exists and belongs to the organization
			const supplier = await db.supplier.findUnique({
				where: {
					id,
					organizationId: data.organizationId,
				},
			});

			if (!supplier) {
				return c.json({ error: "Supplier not found" }, 404);
			}

			// Extract fields that are in the schema but not in the database model
			const {
				date,
				referenceNumber,
				notes,
				paymentMethod,
				...paymentData
			} = data;

			// Create the payment
			const payment = await db.supplierPayment.create({
				data: {
					...paymentData,
					supplierId: id, // Use the ID from the URL parameter
				},
			});

			return c.json(payment, 201);
		},
	);
