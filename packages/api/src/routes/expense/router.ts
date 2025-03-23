import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const expensesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	categoryId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	minAmount: z.number().optional(),
	maxAmount: z.number().optional(),
	search: z.string().optional(),
});

const createExpenseSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	categoryId: z.string().nonempty("Category ID is required"),
	amount: z.number().positive("Amount must be positive"),
	description: z.string().optional(),
});

const updateExpenseSchema = z.object({
	categoryId: z.string().optional(),
	amount: z.number().positive("Amount must be positive").optional(),
	description: z.string().optional(),
});

export const expenseRouter = new Hono()
	.basePath("/expenses")
	// GET all expenses
	.get(
		"/",
		authMiddleware,
		validator("query", expensesQuerySchema),
		describeRoute({
			tags: ["Expenses"],
			summary: "List all expenses",
			description: "Retrieve a list of expenses with optional filtering",
			responses: {
				200: {
					description: "List of expenses",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										amount: { type: "number" },
										description: { type: "string" },
										categoryId: { type: "string" },
										category: {
											type: "object",
											properties: {
												name: { type: "string" },
											},
										},
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
			const {
				organizationId,
				categoryId,
				dateFrom,
				dateTo,
				minAmount,
				maxAmount,
				search,
			} = c.req.valid("query");

			const where: any = { organizationId };

			if (categoryId) {
				where.categoryId = categoryId;
			}

			if (dateFrom || dateTo) {
				where.createdAt = {};
				if (dateFrom) {
					where.createdAt.gte = new Date(dateFrom);
				}
				if (dateTo) {
					where.createdAt.lte = new Date(dateTo);
				}
			}

			if (minAmount !== undefined || maxAmount !== undefined) {
				where.amount = {};
				if (minAmount !== undefined) {
					where.amount.gte = minAmount;
				}
				if (maxAmount !== undefined) {
					where.amount.lte = maxAmount;
				}
			}

			if (search) {
				where.OR = [
					{ description: { contains: search, mode: "insensitive" } },
				];
			}

			const expenses = await db.expense.findMany({
				where,
				orderBy: { createdAt: "desc" },
				include: {
					category: {
						select: {
							name: true,
						},
					},
				},
			});

			return c.json(expenses);
		},
	)
	// GET expense by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Expenses"],
			summary: "Get expense details",
			description:
				"Retrieve detailed information about a specific expense",
			responses: {
				200: {
					description: "Expense details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									categoryId: { type: "string" },
									category: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
										},
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
					description: "Expense not found",
				},
			},
		}),
		async (c) => {
			const expenseId = c.req.param("id");

			const expense = await db.expense.findUnique({
				where: { id: expenseId },
				include: {
					category: true,
				},
			});

			if (!expense) {
				return c.json({ error: "Expense not found" }, 404);
			}

			return c.json(expense);
		},
	)
	// CREATE a new expense
	.post(
		"/",
		authMiddleware,
		validator("json", createExpenseSchema),
		describeRoute({
			tags: ["Expenses"],
			summary: "Create a new expense",
			description: "Create a new business expense record",
			responses: {
				201: {
					description: "Expense created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									categoryId: { type: "string" },
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
					description: "Category not found",
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

			// Check if category exists
			const category = await db.expenseCategory.findUnique({
				where: { id: data.categoryId },
			});

			if (!category) {
				return c.json({ error: "Expense category not found" }, 404);
			}

			try {
				const expense = await db.expense.create({
					data: {
						organizationId: data.organizationId,
						categoryId: data.categoryId,
						amount: data.amount,
						description: data.description,
					},
					include: {
						category: true,
					},
				});

				return c.json(expense, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create expense",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an expense
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateExpenseSchema),
		describeRoute({
			tags: ["Expenses"],
			summary: "Update an expense",
			description: "Update details of an existing expense",
			responses: {
				200: {
					description: "Expense updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									categoryId: { type: "string" },
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
					description: "Expense not found",
				},
			},
		}),
		async (c) => {
			const expenseId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if expense exists
			const expense = await db.expense.findUnique({
				where: { id: expenseId },
			});

			if (!expense) {
				return c.json({ error: "Expense not found" }, 404);
			}

			// If updating category, validate it exists
			if (data.categoryId) {
				const category = await db.expenseCategory.findUnique({
					where: { id: data.categoryId },
				});

				if (!category) {
					return c.json({ error: "Expense category not found" }, 404);
				}
			}

			try {
				const updatedExpense = await db.expense.update({
					where: { id: expenseId },
					data,
					include: {
						category: true,
					},
				});

				return c.json(updatedExpense);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update expense",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE an expense
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Expenses"],
			summary: "Delete an expense",
			description: "Delete an expense record",
			responses: {
				200: {
					description: "Expense deleted successfully",
				},
				404: {
					description: "Expense not found",
				},
			},
		}),
		async (c) => {
			const expenseId = c.req.param("id");

			// Check if expense exists
			const expense = await db.expense.findUnique({
				where: { id: expenseId },
			});

			if (!expense) {
				return c.json({ error: "Expense not found" }, 404);
			}

			try {
				await db.expense.delete({
					where: { id: expenseId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete expense",
						details: error,
					},
					400,
				);
			}
		},
	)
	// Get expense summary by category
	.get(
		"/summary/by-category",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				dateFrom: z.string().optional(),
				dateTo: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Expenses"],
			summary: "Get expense summary by category",
			description:
				"Retrieve summarized expense data grouped by category for a date range",
			responses: {
				200: {
					description: "Expense summary by category",
				},
			},
		}),
		async (c) => {
			const { organizationId, dateFrom, dateTo } = c.req.valid("query");

			// Build the where clause
			const where: any = { organizationId };
			
			if (dateFrom || dateTo) {
				where.createdAt = {};
				if (dateFrom) {
					where.createdAt.gte = new Date(dateFrom);
				}
				if (dateTo) {
					where.createdAt.lte = new Date(dateTo);
				}
			}

			// Get all expense categories for this organization
			const categories = await db.expenseCategory.findMany({
				where: { organizationId },
				select: {
					id: true,
					name: true,
				},
			});

			// Get expenses with their categories
			const expenses = await db.expense.findMany({
				where,
				select: {
					categoryId: true,
					amount: true,
					category: {
						select: {
							name: true,
						},
					},
				},
			});

			// Initialize summary with all categories set to zero
			const summary: Record<string, { categoryId: string; name: string; total: number }> = {};
			categories.forEach((category) => {
				summary[category.id] = {
					categoryId: category.id,
					name: category.name,
					total: 0,
				};
			});

			// Sum amounts by category
			expenses.forEach((expense) => {
				if (summary[expense.categoryId]) {
					summary[expense.categoryId].total += expense.amount;
				}
			});

			// Convert to array format for easier charting
			const result = Object.values(summary);

			return c.json(result);
		},
	);