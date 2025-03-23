import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const transfersQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	fromOutletId: z.string().optional(),
	toOutletId: z.string().optional(),
	productId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const transferIdParamSchema = z.object({
	id: z.string().nonempty("Transfer ID is required"),
});

const createTransferSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	fromOutletId: z.string().nonempty("From Outlet ID is required"),
	toOutletId: z.string().nonempty("To Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().int().positive("Quantity must be a positive integer"),
});

const updateTransferSchema = z.object({
	fromOutletId: z.string().optional(),
	toOutletId: z.string().optional(),
	productId: z.string().optional(),
	quantity: z.number().int().positive().optional(),
});

export const transferRouter = new Hono()
	.basePath("/transfers")
	// GET all transfers
	.get(
		"/",
		authMiddleware,
		validator("query", transfersQuerySchema),
		describeRoute({
			tags: ["Transfers"],
			summary: "List all transfers for an organization",
			description:
				"Retrieve a list of stock transfers with optional filtering",
			responses: {
				200: {
					description: "List of transfers",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									transfers: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												fromOutletId: {
													type: "string",
												},
												toOutletId: {
													type: "string",
												},
												productId: {
													type: "string",
												},
												quantity: {
													type: "number",
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
			const {
				organizationId,
				fromOutletId,
				toOutletId,
				productId,
				limit,
				offset,
			} = c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add fromOutletId filter if provided
			if (fromOutletId) {
				where.fromOutletId = fromOutletId;
			}

			// Add toOutletId filter if provided
			if (toOutletId) {
				where.toOutletId = toOutletId;
			}

			// Add productId filter if provided
			if (productId) {
				where.productId = productId;
			}

			// Get transfers with pagination
			const [transfers, total] = await Promise.all([
				db.transfer.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
					include: {
						fromOutlet: true,
						toOutlet: true,
						product: true,
					},
				}),
				db.transfer.count({ where }),
			]);

			return c.json({ transfers, total });
		},
	)
	// GET a single transfer by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", transferIdParamSchema),
		describeRoute({
			tags: ["Transfers"],
			summary: "Get transfer details",
			description:
				"Retrieve detailed information about a specific transfer",
			responses: {
				200: {
					description: "Transfer details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									fromOutletId: { type: "string" },
									toOutletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
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
					description: "Transfer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const transfer = await db.transfer.findUnique({
				where: { id },
				include: {
					fromOutlet: true,
					toOutlet: true,
					product: true,
				},
			});

			if (!transfer) {
				return c.json({ error: "Transfer not found" }, 404);
			}

			return c.json(transfer);
		},
	)
	// CREATE a new transfer
	.post(
		"/",
		authMiddleware,
		validator("json", createTransferSchema),
		describeRoute({
			tags: ["Transfers"],
			summary: "Create a new transfer",
			description:
				"Create a new stock transfer between outlets and update inventory",
			responses: {
				201: {
					description: "Transfer created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									fromOutletId: { type: "string" },
									toOutletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
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
					description:
						"Invalid input or insufficient inventory in source outlet",
				},
				404: {
					description: "Organization, outlet, or product not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify organization exists
			const organization = await db.organization.findUnique({
				where: { id: data.organizationId },
			});

			if (!organization) {
				return c.json({ error: "Organization not found" }, 404);
			}

			// Verify outlets exist and belong to the organization
			const [fromOutlet, toOutlet] = await Promise.all([
				db.outlet.findUnique({
					where: {
						id: data.fromOutletId,
						organizationId: data.organizationId,
					},
				}),
				db.outlet.findUnique({
					where: {
						id: data.toOutletId,
						organizationId: data.organizationId,
					},
				}),
			]);

			if (!fromOutlet) {
				return c.json({ error: "Source outlet not found" }, 404);
			}

			if (!toOutlet) {
				return c.json(
					{
						error: "Destination outlet not found",
					},
					404,
				);
			}

			// Verify product exists and belongs to the organization
			const product = await db.product.findUnique({
				where: {
					id: data.productId,
					organizationId: data.organizationId,
				},
			});

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			// Create transfer and update inventory in a transaction
			try {
				const transfer = await db.$transaction(async (tx) => {
					// Check source outlet inventory
					const sourceInventory = await tx.inventory.findFirst({
						where: {
							outletId: data.fromOutletId,
							productId: data.productId,
							organizationId: data.organizationId,
						},
					});

					if (
						!sourceInventory ||
						sourceInventory.quantity < data.quantity
					) {
						throw new Error(
							"Insufficient inventory in source outlet",
						);
					}

					// Update source outlet inventory
					await tx.inventory.update({
						where: {
							id: sourceInventory.id,
						},
						data: {
							quantity: {
								decrement: data.quantity,
							},
						},
					});

					// Find or create destination outlet inventory
					const destInventory = await tx.inventory.findFirst({
						where: {
							outletId: data.toOutletId,
							productId: data.productId,
							organizationId: data.organizationId,
						},
					});

					if (destInventory) {
						await tx.inventory.update({
							where: {
								id: destInventory.id,
							},
							data: {
								quantity: {
									increment: data.quantity,
								},
							},
						});
					} else {
						await tx.inventory.create({
							data: {
								outletId: data.toOutletId,
								productId: data.productId,
								organizationId: data.organizationId,
								quantity: data.quantity,
							},
						});
					}

					// Create the transfer record
					return tx.transfer.create({
						data: {
							organizationId: data.organizationId,
							fromOutletId: data.fromOutletId,
							toOutletId: data.toOutletId,
							productId: data.productId,
							quantity: data.quantity,
						},
						include: {
							fromOutlet: true,
							toOutlet: true,
							product: true,
						},
					});
				});

				return c.json(transfer, 201);
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to create transfer" }, 400);
			}
		},
	)
	// UPDATE a transfer
	.put(
		"/:id",
		authMiddleware,
		validator("param", transferIdParamSchema),
		validator("json", updateTransferSchema),
		describeRoute({
			tags: ["Transfers"],
			summary: "Update a transfer",
			description:
				"Update details of an existing transfer and adjust inventory",
			responses: {
				200: {
					description: "Transfer updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									fromOutletId: { type: "string" },
									toOutletId: { type: "string" },
									productId: { type: "string" },
									quantity: { type: "number" },
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
					description: "Invalid input or insufficient inventory",
				},
				404: {
					description: "Transfer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Get the original transfer
			const originalTransfer = await db.transfer.findUnique({
				where: { id },
				include: {
					fromOutlet: true,
					toOutlet: true,
					product: true,
				},
			});

			if (!originalTransfer) {
				return c.json({ error: "Transfer not found" }, 404);
			}

			// Update transfer and adjust inventory in a transaction
			try {
				const updatedTransfer = await db.$transaction(async (tx) => {
					// If quantity is being updated
					if (
						data.quantity &&
						data.quantity !== originalTransfer.quantity
					) {
						// Get source outlet inventory
						const sourceInventory = await tx.inventory.findFirst({
							where: {
								outletId: originalTransfer.fromOutletId,
								productId: originalTransfer.productId,
								organizationId: originalTransfer.organizationId,
							},
						});

						if (!sourceInventory) {
							throw new Error("Source inventory not found");
						}

						// Check if source has enough inventory for increase
						if (data.quantity > originalTransfer.quantity) {
							const additionalQuantity =
								data.quantity - originalTransfer.quantity;
							if (sourceInventory.quantity < additionalQuantity) {
								throw new Error(
									"Insufficient inventory in source outlet",
								);
							}
						}

						// Update source inventory
						await tx.inventory.update({
							where: { id: sourceInventory.id },
							data: {
								quantity: {
									increment:
										originalTransfer.quantity -
										data.quantity,
								},
							},
						});

						// Get destination outlet inventory
						const destInventory = await tx.inventory.findFirst({
							where: {
								outletId: originalTransfer.toOutletId,
								productId: originalTransfer.productId,
								organizationId: originalTransfer.organizationId,
							},
						});

						if (!destInventory) {
							throw new Error("Destination inventory not found");
						}

						// Update destination inventory
						await tx.inventory.update({
							where: { id: destInventory.id },
							data: {
								quantity: {
									increment:
										data.quantity -
										originalTransfer.quantity,
								},
							},
						});
					}

					// Update the transfer record
					return tx.transfer.update({
						where: { id },
						data,
						include: {
							fromOutlet: true,
							toOutlet: true,
							product: true,
						},
					});
				});

				return c.json(updatedTransfer);
			} catch (error) {
				if (error instanceof Error) {
					return c.json({ error: error.message }, 400);
				}
				return c.json({ error: "Failed to update transfer" }, 400);
			}
		},
	)
	// DELETE a transfer
	.delete(
		"/:id",
		authMiddleware,
		validator("param", transferIdParamSchema),
		describeRoute({
			tags: ["Transfers"],
			summary: "Delete a transfer",
			description:
				"Delete an existing transfer and revert inventory changes",
			responses: {
				200: {
					description: "Transfer deleted successfully",
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
					description: "Transfer not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			// Get the transfer to be deleted
			const transfer = await db.transfer.findUnique({
				where: { id },
			});

			if (!transfer) {
				return c.json({ error: "Transfer not found" }, 404);
			}

			// Delete transfer and revert inventory in a transaction
			try {
				await db.$transaction(async (tx) => {
					// Get source outlet inventory
					const sourceInventory = await tx.inventory.findFirst({
						where: {
							outletId: transfer.fromOutletId,
							productId: transfer.productId,
							organizationId: transfer.organizationId,
						},
					});

					if (sourceInventory) {
						// Revert source outlet inventory
						await tx.inventory.update({
							where: { id: sourceInventory.id },
							data: {
								quantity: {
									increment: transfer.quantity,
								},
							},
						});
					}

					// Get destination outlet inventory
					const destInventory = await tx.inventory.findFirst({
						where: {
							outletId: transfer.toOutletId,
							productId: transfer.productId,
							organizationId: transfer.organizationId,
						},
					});

					if (destInventory) {
						// Revert destination outlet inventory
						await tx.inventory.update({
							where: { id: destInventory.id },
							data: {
								quantity: {
									decrement: transfer.quantity,
								},
							},
						});
					}

					// Delete the transfer record
					await tx.transfer.delete({
						where: { id },
					});
				});

				return c.json({
					success: true,
					message: "Transfer deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Failed to delete transfer" }, 400);
			}
		},
	);
