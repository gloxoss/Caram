import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const quotationStatusEnum = [
	"DRAFT",
	"SENT",
	"ACCEPTED",
	"REJECTED",
	"EXPIRED",
	"CONVERTED",
] as const;

// Query schema for listing quotations
const quotationsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	status: z.enum(quotationStatusEnum).optional(),
	customerId: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
	search: z.string().optional(),
});

// Schema for creating a quotation
const createQuotationSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	customerId: z.string().nonempty("Customer ID is required"),
	totalAmount: z.number().positive("Total amount must be positive"),
	status: z.enum(quotationStatusEnum).optional().default("DRAFT"),
});

// Schema for updating a quotation
const updateQuotationSchema = z.object({
	customerId: z.string().optional(),
	totalAmount: z.number().positive().optional(),
	status: z.enum(quotationStatusEnum).optional(),
});

export const quotationRouter = new Hono()
	.basePath("/quotation")
	// GET all quotations
	.get(
		"/",
		authMiddleware,
		validator("query", quotationsQuerySchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "List quotations",
			description:
				"Retrieve a list of quotations with optional filtering",
			responses: {
				200: {
					description: "List of quotations",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				status,
				customerId,
				fromDate,
				toDate,
				search,
			} = c.req.valid("query");

			// Build where clause
			const where: any = {
				organizationId,
				...(status && { status }),
				...(customerId && { customerId }),
			};

			// Add date filtering if specified
			if (fromDate || toDate) {
				where.createdAt = {};
				if (fromDate) {
					where.createdAt.gte = new Date(fromDate);
				}
				if (toDate) {
					where.createdAt.lte = new Date(toDate);
				}
			}

			// Add search functionality
			if (search) {
				where.OR = [
					{
						customer: {
							name: { contains: search, mode: "insensitive" },
						},
					},
				];
			}

			try {
				const quotations = await db.quotation.findMany({
					where,
					orderBy: { createdAt: "desc" },
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json({
					items: quotations,
					count: quotations.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch quotations",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a single quotation by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Quotation"],
			summary: "Get quotation details",
			description:
				"Retrieve detailed information about a specific quotation",
			responses: {
				200: {
					description: "Quotation details",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");

			try {
				const quotation = await db.quotation.findUnique({
					where: { id: quotationId },
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				if (!quotation) {
					return c.json({ error: "Quotation not found" }, 404);
				}

				return c.json(quotation);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch quotation",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new quotation
	.post(
		"/",
		authMiddleware,
		validator("json", createQuotationSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Create quotation",
			description: "Create a new sales quotation",
			responses: {
				201: {
					description: "Quotation created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			try {
				// Verify customer exists
				const customer = await db.customer.findUnique({
					where: {
						id: data.customerId,
						organizationId: data.organizationId,
					},
				});

				if (!customer) {
					return c.json({ error: "Customer not found" }, 404);
				}

				// Create the quotation
				const quotation = await db.quotation.create({
					data: {
						organizationId: data.organizationId,
						customerId: data.customerId,
						totalAmount: data.totalAmount,
						status: data.status,
					},
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json(quotation, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create quotation",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a quotation
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateQuotationSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Update quotation",
			description: "Update details of an existing quotation",
			responses: {
				200: {
					description: "Quotation updated successfully",
				},
				400: {
					description: "Invalid input data",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");
			const data = c.req.valid("json");

			try {
				const quotation = await db.quotation.update({
					where: { id: quotationId },
					data,
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json(quotation);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update quotation",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a quotation
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Quotation"],
			summary: "Delete quotation",
			description: "Delete a quotation",
			responses: {
				200: {
					description: "Quotation deleted successfully",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");

			try {
				await db.quotation.delete({
					where: { id: quotationId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete quotation",
						details: error,
					},
					400,
				);
			}
		},
	);
