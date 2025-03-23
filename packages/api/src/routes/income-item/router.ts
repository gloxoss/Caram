import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const incomeItemQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
});

const createIncomeItemSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Name is required"),
});

const updateIncomeItemSchema = z.object({
	name: z.string().nonempty("Name is required"),
});

export const incomeItemRouter = new Hono()
	.basePath("/income-items")
	// GET all income items
	.get(
		"/",
		authMiddleware,
		validator("query", incomeItemQuerySchema),
		describeRoute({
			tags: ["Income Items"],
			summary: "List all income items",
			description: "Retrieve a list of income items with optional filtering",
			responses: {
				200: {
					description: "List of income items",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										createdAt: {
											type: "string",
											format: "date-time",
										},
									},
								},
							},
						},
					},
				},
			},
		}),
		async (c) => {
			const { organizationId, search } = c.req.valid("query");

			const where: any = { organizationId };

			if (search) {
				where.name = {
					contains: search,
					mode: "insensitive",
				};
			}

			const incomeItems = await db.incomeItem.findMany({
				where,
				orderBy: { name: "asc" },
			});

			return c.json(incomeItems);
		},
	)
	// GET income item by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Income Items"],
			summary: "Get income item details",
			description: "Retrieve detailed information about a specific income item",
			responses: {
				200: {
					description: "Income item details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
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
					description: "Income item not found",
				},
			},
		}),
		async (c) => {
			const incomeItemId = c.req.param("id");

			const incomeItem = await db.incomeItem.findUnique({
				where: { id: incomeItemId },
			});

			if (!incomeItem) {
				return c.json({ error: "Income item not found" }, 404);
			}

			return c.json(incomeItem);
		},
	)
	// CREATE a new income item
	.post(
		"/",
		authMiddleware,
		validator("json", createIncomeItemSchema),
		describeRoute({
			tags: ["Income Items"],
			summary: "Create a new income item",
			description: "Create a new income item category",
			responses: {
				201: {
					description: "Income item created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									createdAt: {
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
					description: "Organization not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Check if organization exists
			const organization = await db.organization.findUnique({
				where: { id: data.organizationId },
			});

			if (!organization) {
				return c.json({ error: "Organization not found" }, 404);
			}

			try {
				const incomeItem = await db.incomeItem.create({
					data: {
						organizationId: data.organizationId,
						name: data.name,
					},
				});

				return c.json(incomeItem, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create income item",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an income item
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateIncomeItemSchema),
		describeRoute({
			tags: ["Income Items"],
			summary: "Update an income item",
			description: "Update details of an existing income item",
			responses: {
				200: {
					description: "Income item updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
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
					description: "Income item not found",
				},
			},
		}),
		async (c) => {
			const incomeItemId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if income item exists
			const incomeItem = await db.incomeItem.findUnique({
				where: { id: incomeItemId },
			});

			if (!incomeItem) {
				return c.json({ error: "Income item not found" }, 404);
			}

			try {
				const updatedIncomeItem = await db.incomeItem.update({
					where: { id: incomeItemId },
					data: {
						name: data.name,
					},
				});

				return c.json(updatedIncomeItem);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update income item",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE an income item
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Income Items"],
			summary: "Delete an income item",
			description: "Delete an income item if it's not used by any income records",
			responses: {
				200: {
					description: "Income item deleted successfully",
				},
				400: {
					description: "Income item is in use and cannot be deleted",
				},
				404: {
					description: "Income item not found",
				},
			},
		}),
		async (c) => {
			const incomeItemId = c.req.param("id");

			// Check if income item exists
			const incomeItem = await db.incomeItem.findUnique({
				where: { id: incomeItemId },
			});

			if (!incomeItem) {
				return c.json({ error: "Income item not found" }, 404);
			}

			// Check if income item is used by any income records
			const incomeCount = await db.income.count({
				where: { itemId: incomeItemId },
			});

			if (incomeCount > 0) {
				return c.json(
					{
						error: "Cannot delete income item that is used by income records",
						count: incomeCount,
					},
					400,
				);
			}

			try {
				await db.incomeItem.delete({
					where: { id: incomeItemId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete income item",
						details: error,
					},
					400,
				);
			}
		},
	);