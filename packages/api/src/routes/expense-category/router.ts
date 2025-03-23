import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const expenseCategoriesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
});

const createExpenseCategorySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Category name is required"),
});

const updateExpenseCategorySchema = z.object({
	name: z.string().optional(),
});

export const expenseCategoryRouter = new Hono()
	.basePath("/expense-categories")
	// GET all expense categories
	.get(
		"/",
		authMiddleware,
		validator("query", expenseCategoriesQuerySchema),
		describeRoute({
			tags: ["Expense Categories"],
			summary: "List all expense categories",
			description: "Retrieve a list of expense categories with optional filtering",
			responses: {
				200: {
					description: "List of expense categories",
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
				where.name = { contains: search, mode: "insensitive" };
			}

			const categories = await db.expenseCategory.findMany({
				where,
				orderBy: { name: "asc" },
			});

			return c.json(categories);
		},
	)
	// GET expense category by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Expense Categories"],
			summary: "Get expense category details",
			description:
				"Retrieve detailed information about a specific expense category",
			responses: {
				200: {
					description: "Expense category details",
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
					description: "Expense category not found",
				},
			},
		}),
		async (c) => {
			const categoryId = c.req.param("id");

			const category = await db.expenseCategory.findUnique({
				where: { id: categoryId },
			});

			if (!category) {
				return c.json({ error: "Expense category not found" }, 404);
			}

			// Get count of expenses using this category
			const expenseCount = await db.expense.count({
				where: { categoryId },
			});

			return c.json({
				...category,
				expenseCount,
			});
		},
	)
	// CREATE a new expense category
	.post(
		"/",
		authMiddleware,
		validator("json", createExpenseCategorySchema),
		describeRoute({
			tags: ["Expense Categories"],
			summary: "Create a new expense category",
			description: "Create a new expense category",
			responses: {
				201: {
					description: "Expense category created successfully",
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

			// Check if category with same name already exists
			const existingCategory = await db.expenseCategory.findFirst({
				where: {
					organizationId: data.organizationId,
					name: {
						equals: data.name,
						mode: "insensitive",
					},
				},
			});

			if (existingCategory) {
				return c.json(
					{ error: "A category with this name already exists" },
					400
				);
			}

			try {
				const category = await db.expenseCategory.create({
					data: {
						organizationId: data.organizationId,
						name: data.name,
					},
				});

				return c.json(category, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create expense category",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an expense category
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateExpenseCategorySchema),
		describeRoute({
			tags: ["Expense Categories"],
			summary: "Update an expense category",
			description: "Update details of an existing expense category",
			responses: {
				200: {
					description: "Expense category updated successfully",
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
					description: "Expense category not found",
				},
			},
		}),
		async (c) => {
			const categoryId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if category exists
			const category = await db.expenseCategory.findUnique({
				where: { id: categoryId },
			});

			if (!category) {
				return c.json({ error: "Expense category not found" }, 404);
			}

			// If updating name, check if another category with same name exists
			if (data.name) {
				const existingCategory = await db.expenseCategory.findFirst({
					where: {
						organizationId: category.organizationId,
						name: {
							equals: data.name,
							mode: "insensitive",
						},
						id: {
							not: categoryId,
						},
					},
				});

				if (existingCategory) {
					return c.json(
						{ error: "A category with this name already exists" },
						400
					);
				}
			}

			try {
				const updatedCategory = await db.expenseCategory.update({
					where: { id: categoryId },
					data,
				});

				return c.json(updatedCategory);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update expense category",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE an expense category
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Expense Categories"],
			summary: "Delete an expense category",
			description: "Delete an expense category if it's not in use",
			responses: {
				200: {
					description: "Expense category deleted successfully",
				},
				400: {
					description: "Cannot delete a category that is in use",
				},
				404: {
					description: "Expense category not found",
				},
			},
		}),
		async (c) => {
			const categoryId = c.req.param("id");

			// Check if category exists
			const category = await db.expenseCategory.findUnique({
				where: { id: categoryId },
			});

			if (!category) {
				return c.json({ error: "Expense category not found" }, 404);
			}

			// Check if category is in use
			const expenseCount = await db.expense.count({
				where: { categoryId },
			});

			if (expenseCount > 0) {
				return c.json(
					{
						error: "Cannot delete a category that is in use by expenses",
						expenseCount,
					},
					400,
				);
			}

			try {
				await db.expenseCategory.delete({
					where: { id: categoryId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete expense category",
						details: error,
					},
					400,
				);
			}
		},
	);