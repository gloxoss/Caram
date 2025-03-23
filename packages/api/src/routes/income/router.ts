import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const incomeQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	itemId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	minAmount: z.number().optional(),
	maxAmount: z.number().optional(),
	search: z.string().optional(),
});

const createIncomeSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	itemId: z.string().nonempty("Income item ID is required"),
	amount: z.number().positive("Amount must be positive"),
	description: z.string().optional(),
});

const updateIncomeSchema = z.object({
	itemId: z.string().optional(),
	amount: z.number().positive("Amount must be positive").optional(),
	description: z.string().optional(),
});

export const incomeRouter = new Hono()
	.basePath("/income")
	// GET all income records
	.get(
		"/",
		authMiddleware,
		validator("query", incomeQuerySchema),
		describeRoute({
			tags: ["Income"],
			summary: "List all income records",
			description: "Retrieve a list of income records with optional filtering",
			responses: {
				200: {
					description: "List of income records",
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
										itemId: { type: "string" },
										item: {
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
				itemId,
				dateFrom,
				dateTo,
				minAmount,
				maxAmount,
				search,
			} = c.req.valid("query");

			const where: any = { organizationId };

			if (itemId) {
				where.itemId = itemId;
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

			const incomeRecords = await db.income.findMany({
				where,
				orderBy: { createdAt: "desc" },
				include: {
					item: {
						select: {
							name: true,
						},
					},
				},
			});

			return c.json(incomeRecords);
		},
	)
	// GET income by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Income"],
			summary: "Get income details",
			description: "Retrieve detailed information about a specific income record",
			responses: {
				200: {
					description: "Income details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									itemId: { type: "string" },
									item: {
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
					description: "Income record not found",
				},
			},
		}),
		async (c) => {
			const incomeId = c.req.param("id");

			const income = await db.income.findUnique({
				where: { id: incomeId },
				include: {
					item: true,
				},
			});

			if (!income) {
				return c.json({ error: "Income record not found" }, 404);
			}

			return c.json(income);
		},
	)
	// CREATE a new income record
	.post(
		"/",
		authMiddleware,
		validator("json", createIncomeSchema),
		describeRoute({
			tags: ["Income"],
			summary: "Create a new income record",
			description: "Create a new business income record",
			responses: {
				201: {
					description: "Income record created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									itemId: { type: "string" },
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
					description: "Income item not found",
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

			// Check if income item exists
			const incomeItem = await db.incomeItem.findUnique({
				where: { id: data.itemId },
			});

			if (!incomeItem) {
				return c.json({ error: "Income item not found" }, 404);
			}

			try {
				const income = await db.income.create({
					data: {
						organizationId: data.organizationId,
						itemId: data.itemId,
						amount: data.amount,
						description: data.description,
					},
					include: {
						item: true,
					},
				});

				return c.json(income, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create income record",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an income record
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateIncomeSchema),
		describeRoute({
			tags: ["Income"],
			summary: "Update an income record",
			description: "Update details of an existing income record",
			responses: {
				200: {
					description: "Income record updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									amount: { type: "number" },
									description: { type: "string" },
									itemId: { type: "string" },
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
					description: "Income record not found",
				},
			},
		}),
		async (c) => {
			const incomeId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if income record exists
			const income = await db.income.findUnique({
				where: { id: incomeId },
			});

			if (!income) {
				return c.json({ error: "Income record not found" }, 404);
			}

			// If updating item, validate it exists
			if (data.itemId) {
				const incomeItem = await db.incomeItem.findUnique({
					where: { id: data.itemId },
				});

				if (!incomeItem) {
					return c.json({ error: "Income item not found" }, 404);
				}
			}

			try {
				const updatedIncome = await db.income.update({
					where: { id: incomeId },
					data,
					include: {
						item: true,
					},
				});

				return c.json(updatedIncome);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update income record",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE an income record
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Income"],
			summary: "Delete an income record",
			description: "Delete an income record",
			responses: {
				200: {
					description: "Income record deleted successfully",
				},
				404: {
					description: "Income record not found",
				},
			},
		}),
		async (c) => {
			const incomeId = c.req.param("id");

			// Check if income record exists
			const income = await db.income.findUnique({
				where: { id: incomeId },
			});

			if (!income) {
				return c.json({ error: "Income record not found" }, 404);
			}

			try {
				await db.income.delete({
					where: { id: incomeId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete income record",
						details: error,
					},
					400,
				);
			}
		},
	)
	// Get income summary by item
	.get(
		"/summary/by-item",
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
			tags: ["Income"],
			summary: "Get income summary by item",
			description:
				"Retrieve summarized income data grouped by item for a date range",
			responses: {
				200: {
					description: "Income summary by item",
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

			// Get all income items for this organization
			const items = await db.incomeItem.findMany({
				where: { organizationId },
				select: {
					id: true,
					name: true,
				},
			});

			// Get incomes with their items
			const incomes = await db.income.findMany({
				where,
				select: {
					itemId: true,
					amount: true,
					item: {
						select: {
							name: true,
						},
					},
				},
			});

			// Initialize summary with all items set to zero
			const summary: Record<string, { itemId: string; name: string; total: number }> = {};
			items.forEach((item) => {
				summary[item.id] = {
					itemId: item.id,
					name: item.name,
					total: 0,
				};
			});

			// Sum amounts by item
			incomes.forEach((income) => {
				if (summary[income.itemId]) {
					summary[income.itemId].total += income.amount;
				}
			});

			// Convert to array format for easier charting
			const result = Object.values(summary);

			return c.json(result);
		},
	);