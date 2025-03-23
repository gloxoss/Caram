import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const transactionsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	accountId: z.string().optional(),
	type: z.string().optional(),
	amount: z.coerce.number().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const transactionIdParamSchema = z.object({
	id: z.string().nonempty("Transaction ID is required"),
});

const createTransactionSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	accountId: z.string().nonempty("Account ID is required"),
	type: z.string().nonempty("Type is required"), // e.g., "Deposit", "Withdraw"
	amount: z.number().positive("Amount must be positive"),
});

const updateTransactionSchema = z.object({
	accountId: z.string().optional(),
	type: z.string().optional(),
	amount: z.number().positive().optional(),
});

export const transactionRouter = new Hono()
	.basePath("/transactions")
	// GET all transactions
	.get(
		"/",
		authMiddleware,
		validator("query", transactionsQuerySchema),
		describeRoute({
			tags: ["Transactions"],
			summary: "List all transactions for an organization",
			description:
				"Retrieve a list of transactions with optional filtering",
			responses: {
				200: {
					description: "List of transactions",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									transactions: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												accountId: { type: "string" },
												type: { type: "string" },
												amount: { type: "number" },
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
			const { organizationId, accountId, type, amount, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add accountId filter if provided
			if (accountId) {
				where.accountId = accountId;
			}

			// Add type filter if provided
			if (type) {
				where.type = { contains: type, mode: "insensitive" };
			}

			// Add amount filter if provided
			if (amount) {
				where.amount = amount;
			}

			// Get transactions with pagination
			const [transactions, total] = await Promise.all([
				db.transaction.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
					include: {
						account: true,
					},
				}),
				db.transaction.count({ where }),
			]);

			return c.json({ transactions, total });
		},
	)
	// GET a single transaction by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", transactionIdParamSchema),
		describeRoute({
			tags: ["Transactions"],
			summary: "Get transaction details",
			description:
				"Retrieve detailed information about a specific transaction",
			responses: {
				200: {
					description: "Transaction details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									accountId: { type: "string" },
									type: { type: "string" },
									amount: { type: "number" },
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
					description: "Transaction not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const transaction = await db.transaction.findUnique({
				where: { id },
				include: {
					account: true,
				},
			});

			if (!transaction) {
				return c.json({ error: "Transaction not found" }, 404);
			}

			return c.json(transaction);
		},
	)
	// CREATE a new transaction
	.post(
		"/",
		authMiddleware,
		validator("json", createTransactionSchema),
		describeRoute({
			tags: ["Transactions"],
			summary: "Create a new transaction",
			description:
				"Create a new transaction associated with an organization and account",
			responses: {
				201: {
					description: "Transaction created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									accountId: { type: "string" },
									type: { type: "string" },
									amount: { type: "number" },
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
				404: {
					description: "Account not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify account exists
			const account = await db.accountOrg.findUnique({
				where: {
					id: data.accountId,
					organizationId: data.organizationId,
				},
			});

			if (!account) {
				return c.json({ error: "Account not found" }, 404);
			}

			// Create transaction and update account balance in a transaction
			const transaction = await db.$transaction(async (tx) => {
				// Create the transaction
				const newTransaction = await tx.transaction.create({
					data: {
						organizationId: data.organizationId,
						accountId: data.accountId,
						type: data.type,
						amount: data.amount,
					},
					include: {
						account: true,
					},
				});

				// Update account balance
				const balanceChange =
					data.type.toLowerCase() === "deposit"
						? data.amount
						: -data.amount;

				await tx.accountOrg.update({
					where: { id: data.accountId },
					data: {
						balance: {
							increment: balanceChange,
						},
					},
				});

				return newTransaction;
			});

			return c.json(transaction, 201);
		},
	)
	// UPDATE a transaction
	.put(
		"/:id",
		authMiddleware,
		validator("param", transactionIdParamSchema),
		validator("json", updateTransactionSchema),
		describeRoute({
			tags: ["Transactions"],
			summary: "Update a transaction",
			description: "Update details of an existing transaction",
			responses: {
				200: {
					description: "Transaction updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									accountId: { type: "string" },
									type: { type: "string" },
									amount: { type: "number" },
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
					description: "Transaction not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Get the original transaction
			const originalTransaction = await db.transaction.findUnique({
				where: { id },
			});

			if (!originalTransaction) {
				return c.json({ error: "Transaction not found" }, 404);
			}

			// Update transaction and adjust account balances in a transaction
			const updatedTransaction = await db.$transaction(async (tx) => {
				// If amount is being updated, adjust the old account balance
				if (data.amount && data.amount !== originalTransaction.amount) {
					const oldBalanceChange =
						originalTransaction.type.toLowerCase() === "deposit"
							? -originalTransaction.amount
							: originalTransaction.amount;

					const newBalanceChange =
						originalTransaction.type.toLowerCase() === "deposit"
							? data.amount
							: -data.amount;

					await tx.accountOrg.update({
						where: { id: originalTransaction.accountId },
						data: {
							balance: {
								increment: oldBalanceChange + newBalanceChange,
							},
						},
					});
				}

				// If account is being changed, adjust both old and new account balances
				if (
					data.accountId &&
					data.accountId !== originalTransaction.accountId
				) {
					const amount = data.amount || originalTransaction.amount;
					const type = data.type || originalTransaction.type;

					// Remove amount from old account
					const oldBalanceChange =
						originalTransaction.type.toLowerCase() === "deposit"
							? -originalTransaction.amount
							: originalTransaction.amount;

					await tx.accountOrg.update({
						where: { id: originalTransaction.accountId },
						data: {
							balance: {
								increment: oldBalanceChange,
							},
						},
					});

					// Add amount to new account
					const newBalanceChange =
						type.toLowerCase() === "deposit" ? amount : -amount;

					await tx.accountOrg.update({
						where: { id: data.accountId },
						data: {
							balance: {
								increment: newBalanceChange,
							},
						},
					});
				}

				// Update the transaction
				return tx.transaction.update({
					where: { id },
					data,
					include: {
						account: true,
					},
				});
			});

			return c.json(updatedTransaction);
		},
	)
	// DELETE a transaction
	.delete(
		"/:id",
		authMiddleware,
		validator("param", transactionIdParamSchema),
		describeRoute({
			tags: ["Transactions"],
			summary: "Delete a transaction",
			description: "Delete an existing transaction",
			responses: {
				200: {
					description: "Transaction deleted successfully",
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
					description: "Transaction not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			// Get the transaction to be deleted
			const transaction = await db.transaction.findUnique({
				where: { id },
			});

			if (!transaction) {
				return c.json({ error: "Transaction not found" }, 404);
			}

			// Delete transaction and update account balance in a transaction
			await db.$transaction(async (tx) => {
				// Update account balance
				const balanceChange =
					transaction.type.toLowerCase() === "deposit"
						? -transaction.amount
						: transaction.amount;

				await tx.accountOrg.update({
					where: { id: transaction.accountId },
					data: {
						balance: {
							increment: balanceChange,
						},
					},
				});

				// Delete the transaction
				await tx.transaction.delete({
					where: { id },
				});
			});

			return c.json({
				success: true,
				message: "Transaction deleted successfully",
			});
		},
	);
