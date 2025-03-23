import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const purchaseOrgQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const createPurchaseOrgSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	code: z.string().optional(),
	description: z.string().optional(),
	contactName: z.string().optional(),
	contactEmail: z.string().email().optional(),
	contactPhone: z.string().optional(),
	isActive: z.boolean().optional().default(true),
	notes: z.string().optional(),
	supplierId: z.string().optional(),
	totalAmount: z.number().optional().default(0),
});

const updatePurchaseOrgSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	code: z.string().optional(),
	description: z.string().optional(),
	contactName: z.string().optional(),
	contactEmail: z.string().email().optional(),
	contactPhone: z.string().optional(),
	isActive: z.boolean().optional(),
	notes: z.string().optional(),
});

export const purchaseOrgRouter = new Hono()
	.basePath("/purchase-orgs")
	// GET all purchase orgs
	.get(
		"/",
		authMiddleware,
		validator("query", purchaseOrgQuerySchema),
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "List all purchase organizations",
			description:
				"Retrieve a list of purchase organizations associated with the specified organization ID",
			responses: {
				200: {
					description: "List of purchase organizations",
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
										code: { type: "string" },
										isActive: { type: "boolean" },
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
			const purchaseOrgs = await db.purchaseOrg.findMany({
				where: { organizationId },
				orderBy: { createdAt: "desc" },
			});
			return c.json(purchaseOrgs);
		},
	)
	// GET a single purchase org by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "Get purchase organization details",
			description:
				"Retrieve detailed information about a specific purchase organization",
			responses: {
				200: {
					description: "Purchase organization details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									code: { type: "string" },
									description: { type: "string" },
									contactName: { type: "string" },
									contactEmail: { type: "string" },
									contactPhone: { type: "string" },
									isActive: { type: "boolean" },
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
					description: "Purchase organization not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrgId = c.req.param("id");

			const purchaseOrg = await db.purchaseOrg.findUnique({
				where: { id: purchaseOrgId },
			});

			if (!purchaseOrg) {
				return c.json(
					{ error: "Purchase organization not found" },
					404,
				);
			}

			return c.json(purchaseOrg);
		},
	)
	// CREATE a new purchase org
	.post(
		"/",
		authMiddleware,
		validator("json", createPurchaseOrgSchema),
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "Create a new purchase organization",
			description:
				"Create a new purchase organization for supplier procurement",
			responses: {
				201: {
					description: "Purchase organization created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									code: { type: "string" },
									isActive: { type: "boolean" },
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

			const purchaseOrg = await db.purchaseOrg.create({
				data: data as any,
			});

			return c.json(purchaseOrg, 201);
		},
	)
	// UPDATE a purchase org
	.put(
		"/:id",
		authMiddleware,
		validator("json", updatePurchaseOrgSchema),
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "Update a purchase organization",
			description: "Update details of an existing purchase organization",
			responses: {
				200: {
					description: "Purchase organization updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									code: { type: "string" },
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
					description: "Purchase organization not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrgId = c.req.param("id");
			const data = c.req.valid("json");

			try {
				const purchaseOrg = await db.purchaseOrg.update({
					where: { id: purchaseOrgId },
					data: data as any,
				});

				return c.json(purchaseOrg);
			} catch (error) {
				return c.json(
					{ error: "Purchase organization not found" },
					404,
				);
			}
		},
	)
	// DELETE a purchase org
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "Delete a purchase organization",
			description:
				"Delete an existing purchase organization (will fail if it has associated purchase orders)",
			responses: {
				200: {
					description: "Purchase organization deleted successfully",
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
						"Cannot delete purchase organization with associated data",
				},
				404: {
					description: "Purchase organization not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrgId = c.req.param("id");

			try {
				// Check if purchase org has associated purchase orders
				const purchaseOrdersCount = await db.purchaseOrder.count({
					where: {
						supplierId: {
							in: await db.supplier
								.findMany({
									where: {
										purchases: {
											some: { id: purchaseOrgId },
										},
									},
									select: { id: true },
								})
								.then((suppliers) =>
									suppliers.map((s) => s.id),
								),
						},
					} as any,
				});

				if (purchaseOrdersCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete purchase organization with associated purchase orders",
						},
						400,
					);
				}

				await db.purchaseOrg.delete({
					where: { id: purchaseOrgId },
				});

				return c.json({
					success: true,
					message: "Purchase organization deleted successfully",
				});
			} catch (error) {
				return c.json(
					{ error: "Purchase organization not found" },
					404,
				);
			}
		},
	)
	// GET suppliers linked to a purchase org
	.get(
		"/:id/suppliers",
		authMiddleware,
		describeRoute({
			tags: ["Purchase Organizations"],
			summary: "Get linked suppliers",
			description:
				"Retrieve all suppliers linked to a specific purchase organization",
			responses: {
				200: {
					description: "Linked suppliers",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										contactPerson: { type: "string" },
										email: { type: "string" },
										phone: { type: "string" },
										status: { type: "string" },
									},
								},
							},
						},
					},
				},
				404: {
					description: "Purchase organization not found",
				},
			},
		}),
		async (c) => {
			const purchaseOrgId = c.req.param("id");

			// Verify purchase org exists
			const purchaseOrg = await db.purchaseOrg.findUnique({
				where: { id: purchaseOrgId },
			});

			if (!purchaseOrg) {
				return c.json(
					{ error: "Purchase organization not found" },
					404,
				);
			}

			// Get all suppliers linked to this purchase org
			const suppliers = await db.supplier.findMany({
				where: {
					purchases: { some: { id: purchaseOrgId } },
				},
				select: {
					id: true,
					name: true,
					contact: true,
					address: true,
				},
				orderBy: { name: "asc" },
			});

			return c.json(suppliers);
		},
	);
