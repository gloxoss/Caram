import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const accountTypes = [
	"ASSET",
	"LIABILITY",
	"EQUITY",
	"REVENUE",
	"EXPENSE",
] as const;

const accountsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	type: z.enum(accountTypes).optional(),
	search: z.string().optional(),
});

const createAccountSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Account name is required"),
	type: z.enum(accountTypes),
	balance: z.number().default(0),
});

const updateAccountSchema = z.object({
	name: z.string().optional(),
	type: z.enum(accountTypes).optional(),
	balance: z.number().optional(),
});

export const accountOrgRouter = new Hono()
	.basePath("/accounts")
	// GET all accounts
	.get(
		"/",
		authMiddleware,
		validator("query", accountsQuerySchema),
		describeRoute({
			tags: ["Accounts"],
			summary: "List all accounts",
			description: "Retrieve a list of accounts with optional filtering",
			responses: {
				200: {
					description: "List of accounts",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										type: { type: "string" },
										balance: { type: "number" },
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
			const { organizationId, type, search } = c.req.valid("query");

			const where: any = { organizationId };

			if (type) {
				where.type = type;
			}

			if (search) {
				where.name = { contains: search, mode: "insensitive" };
			}

			const accounts = await db.accountOrg.findMany({
				where,
				orderBy: { name: "asc" },
			});

			return c.json(accounts);
		},
	)
	// GET account hierarchy
	.get(
		"/hierarchy",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
			}),
		),
		describeRoute({
			tags: ["Accounts"],
			summary: "Get account hierarchy",
			description: "Retrieve accounts grouped by type",
			responses: {
				200: {
					description: "Account hierarchy",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									ASSET: {
										type: "array",
										items: { type: "object" },
									},
									LIABILITY: {
										type: "array",
										items: { type: "object" },
									},
									EQUITY: {
										type: "array",
										items: { type: "object" },
									},
									REVENUE: {
										type: "array",
										items: { type: "object" },
									},
									EXPENSE: {
										type: "array",
										items: { type: "object" },
									},
								},
							},
						},
					},
				},
			},
		}),
		async (c) => {
			const { organizationId } = c.req.valid("query");

			const accounts = await db.accountOrg.findMany({
				where: {
					organizationId,
				},
				orderBy: { type: "asc" },
			});

			// Group accounts by type
			const accountsByType: Record<string, any[]> = {};

			// Initialize with empty arrays for each type
			accountTypes.forEach((type) => {
				accountsByType[type] = [];
			});

			// Group accounts by type
			accounts.forEach((account) => {
				if (accountsByType[account.type]) {
					accountsByType[account.type].push(account);
				}
			});

			return c.json(accountsByType);
		},
	)
	// GET a single account by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Accounts"],
			summary: "Get account details",
			description:
				"Retrieve detailed information about a specific account",
			responses: {
				200: {
					description: "Account details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									type: { type: "string" },
									balance: { type: "number" },
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
					description: "Account not found",
				},
			},
		}),
		async (c) => {
			const accountId = c.req.param("id");

			const account = await db.accountOrg.findUnique({
				where: { id: accountId },
			});

			if (!account) {
				return c.json({ error: "Account not found" }, 404);
			}

			// Fetch recent transactions for this account
			const recentTransactions = await db.transaction.findMany({
				where: {
					OR: [{ accountId: accountId }],
				},
				orderBy: { createdAt: "desc" },
				take: 5,
			});

			return c.json({
				...account,
				recentTransactions,
			});
		},
	)
	// CREATE a new account
	.post(
		"/",
		authMiddleware,
		validator("json", createAccountSchema),
		describeRoute({
			tags: ["Accounts"],
			summary: "Create a new account",
			description: "Create a new account in the chart of accounts",
			responses: {
				201: {
					description: "Account created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									type: { type: "string" },
									balance: { type: "number" },
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

			try {
				const account = await db.accountOrg.create({
					data: {
						organizationId: data.organizationId,
						name: data.name,
						type: data.type,
						balance: data.balance,
					},
				});

				return c.json(account, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create account",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE an account
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateAccountSchema),
		describeRoute({
			tags: ["Accounts"],
			summary: "Update an account",
			description: "Update details of an existing account",
			responses: {
				200: {
					description: "Account updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									type: { type: "string" },
									balance: { type: "number" },
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
					description: "Account not found",
				},
			},
		}),
		async (c) => {
			const accountId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if account exists
			const account = await db.accountOrg.findUnique({
				where: { id: accountId },
			});

			if (!account) {
				return c.json({ error: "Account not found" }, 404);
			}

			try {
				const updatedAccount = await db.accountOrg.update({
					where: { id: accountId },
					data,
				});
				return c.json(updatedAccount);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update account",
						details: error,
					},
					400,
				);
			}
		},
	)
	// Get account transactions
	.get(
		"/:id/transactions",
		authMiddleware,
		validator(
			"query",
			z.object({
				startDate: z.string().optional(),
				endDate: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Accounts"],
			summary: "Get account transactions",
			description: "Retrieve the transaction history for an account",
			responses: {
				200: {
					description: "Account transactions",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										type: { type: "string" },
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
				},
				404: {
					description: "Account not found",
				},
			},
		}),
		async (c) => {
			const accountId = c.req.param("id");
			const { startDate, endDate } = c.req.valid("query");

			// Check if account exists
			const account = await db.accountOrg.findUnique({
				where: { id: accountId },
			});

			if (!account) {
				return c.json({ error: "Account not found" }, 404);
			}

			const where: any = {
				accountId: accountId,
			};

			if (startDate) {
				where.createdAt = { gte: new Date(startDate) };
			}

			if (endDate) {
				where.createdAt = {
					...(where.createdAt || {}),
					lte: new Date(endDate),
				};
			}

			const transactions = await db.transaction.findMany({
				where,
				orderBy: { createdAt: "asc" },
			});

			return c.json(transactions);
		},
	);
