import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const damageStatusEnum = [
	"REPORTED",
	"INSPECTED",
	"REPAIRABLE",
	"REPAIRED",
	"SCRAPPED",
	"RESOLVED",
] as const;

const damageSeverityEnum = [
	"MINOR",
	"MODERATE",
	"SEVERE",
	"CRITICAL",
	"DESTROYED",
] as const;

const damageTypeEnum = [
	"PHYSICAL",
	"WATER",
	"FIRE",
	"ELECTRICAL",
	"CONTAMINATION",
	"EXPIRED",
	"DEFECTIVE",
	"OTHER",
] as const;

// Query schema for listing damaged items
const damageQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	status: z.enum(damageStatusEnum).optional(),
	severity: z.enum(damageSeverityEnum).optional(),
	type: z.enum(damageTypeEnum).optional(),
	productId: z.string().optional(),
	outletId: z.string().optional(),
	reportedById: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
	search: z.string().optional(),
});

// Schema for creating a damaged item report
const createDamageSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	productId: z.string().nonempty("Product ID is required"),
	quantity: z.number().positive("Quantity must be positive"),
	damageDate: z.string().transform((val) => new Date(val)),
	damageType: z.enum(damageTypeEnum),
	severity: z.enum(damageSeverityEnum),
	description: z.string().optional(),
	location: z.string().optional(),
	images: z.array(z.string()).optional(),
	estimatedCost: z.number().optional(),
	reportedById: z.string().optional(),
	batchNumber: z.string().optional(),
	serialNumber: z.string().optional(),
	actionTaken: z.string().optional(),
});

// Schema for updating a damaged item report
const updateDamageSchema = z.object({
	status: z.enum(damageStatusEnum).optional(),
	severity: z.enum(damageSeverityEnum).optional(),
	description: z.string().optional(),
	quantity: z.number().positive("Quantity must be positive").optional(),
	location: z.string().optional(),
	images: z.array(z.string()).optional(),
	inspectedById: z.string().optional(),
	inspectionNotes: z.string().optional(),
	inspectionDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	repairCost: z.number().min(0).optional(),
	actionTaken: z.string().optional(),
});

// Schema for logging repair actions
const repairActionSchema = z.object({
	notes: z.string().nonempty("Repair notes are required"),
	cost: z.number().min(0).optional(),
	completedById: z.string().optional(),
	repairDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	status: z.enum(["REPAIRED", "PARTIALLY_REPAIRED"]).optional(),
	quantityRepaired: z.number().optional(),
});

// Schema for scrapping damaged items
const scrapItemSchema = z.object({
	notes: z.string().nonempty("Scrap notes are required"),
	scrapDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	approvedById: z.string().optional(),
	quantityScrapped: z.number().optional(),
	recoveryValue: z.number().min(0).optional(),
});

export const damageRouter = new Hono()
	.basePath("/damage")
	// GET all damaged items
	.get(
		"/",
		authMiddleware,
		validator("query", damageQuerySchema),
		describeRoute({
			tags: ["Damage"],
			summary: "List damaged items",
			description:
				"Retrieve a list of damaged inventory items with optional filtering",
			responses: {
				200: {
					description: "List of damaged items",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				status,
				severity,
				type,
				productId,
				outletId,
				reportedById,
				fromDate,
				toDate,
				search,
			} = c.req.valid("query");

			// Build the where clause
			const where = {
				organizationId,
				...(status && { status }),
				...(severity && { severity }),
				...(type && { damageType: type }),
				...(productId && { productId }),
				...(outletId && { outletId }),
				...(reportedById && { reportedById }),
			};

			// Add date filtering if specified
			if (fromDate || toDate) {
				where.damageDate = {};
				if (fromDate) where.damageDate.gte = new Date(fromDate);
				if (toDate) where.damageDate.lte = new Date(toDate);
			}

			// Add search functionality
			if (search) {
				where.OR = [
					{ description: { contains: search, mode: "insensitive" } },
					{ location: { contains: search, mode: "insensitive" } },
					{ serialNumber: { contains: search, mode: "insensitive" } },
					{ batchNumber: { contains: search, mode: "insensitive" } },
					{
						product: {
							name: { contains: search, mode: "insensitive" },
						},
					},
				];
			}

			try {
				const damages = await db.damage.findMany({
					where,
					orderBy: { damageDate: "desc" },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						outlet: {
							select: {
								id: true,
								name: true,
							},
						},
						reportedBy: {
							select: {
								id: true,
								name: true,
							},
						},
						repairActions: {
							orderBy: { createdAt: "desc" },
							take: 1,
							select: {
								id: true,
								cost: true,
								repairDate: true,
								status: true,
							},
						},
					},
				});

				// Calculate totals and statistics
				const totalItems = damages.length;
				const totalDamagedQuantity = damages.reduce(
					(total, item) => total + item.quantity,
					0,
				);
				const totalValue = damages.reduce((total, item) => {
					// Calculate value based on product price * quantity
					const itemValue = (item.estimatedCost || 0) * item.quantity;
					return total + itemValue;
				}, 0);

				return c.json({
					items: damages,
					meta: {
						totalItems,
						totalDamagedQuantity,
						totalValue,
						byStatus: countByProperty(damages, "status"),
						bySeverity: countByProperty(damages, "severity"),
						byType: countByProperty(damages, "damageType"),
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damaged items",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a specific damaged item by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Damage"],
			summary: "Get damaged item details",
			description:
				"Retrieve detailed information about a specific damaged item",
			responses: {
				200: {
					description: "Damaged item details",
				},
				404: {
					description: "Damaged item not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");

			try {
				const damage = await db.damage.findUnique({
					where: { id: damageId },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
								description: true,
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						outlet: {
							select: {
								id: true,
								name: true,
								location: true,
							},
						},
						reportedBy: {
							select: {
								id: true,
								name: true,
							},
						},
						inspectedBy: {
							select: {
								id: true,
								name: true,
							},
						},
						repairActions: {
							orderBy: { createdAt: "desc" },
							include: {
								completedBy: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						scrapActions: {
							orderBy: { createdAt: "desc" },
							include: {
								approvedBy: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				});

				if (!damage) {
					return c.json({ error: "Damaged item not found" }, 404);
				}

				// Calculate additional data
				const totalRepairCost =
					damage.repairActions?.reduce(
						(total, action) => total + (action.cost || 0),
						0,
					) || 0;
				const recoveryValue =
					damage.scrapActions?.reduce(
						(total, action) => total + (action.recoveryValue || 0),
						0,
					) || 0;

				return c.json({
					...damage,
					meta: {
						totalRepairCost,
						recoveryValue,
						netLoss:
							(damage.estimatedCost || 0) -
							totalRepairCost -
							recoveryValue,
						daysSinceReported: Math.floor(
							(new Date().getTime() -
								damage.damageDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damaged item",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new damaged item report
	.post(
		"/",
		authMiddleware,
		validator("json", createDamageSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Report damaged item",
			description: "Create a new damaged inventory report",
			responses: {
				201: {
					description: "Damaged item reported successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			try {
				// Validate product exists
				const product = await db.product.findUnique({
					where: { id: data.productId },
					include: {
						inventory: {
							where: { outletId: data.outletId },
						},
					},
				});

				if (!product) {
					return c.json({ error: "Product not found" }, 404);
				}

				// Validate outlet exists
				const outlet = await db.outlet.findUnique({
					where: { id: data.outletId },
				});

				if (!outlet) {
					return c.json({ error: "Outlet not found" }, 404);
				}

				// Check if there's enough inventory
				const inventory = product.inventory?.[0];
				if (!inventory || inventory.quantity < data.quantity) {
					return c.json(
						{
							error: "Insufficient inventory quantity",
							available: inventory?.quantity || 0,
							requested: data.quantity,
						},
						400,
					);
				}

				// Create a transaction to handle both damage report and inventory update
				const [damageReport, _] = await db.$transaction([
					// Create the damage report
					db.damage.create({
						data: {
							...data,
							status: "REPORTED",
							reportedById: data.reportedById || userId,
							images: data.images
								? JSON.stringify(data.images)
								: null,
						},
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
							outlet: {
								select: {
									id: true,
									name: true,
								},
							},
							reportedBy: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					}),
					// Update the inventory
					db.inventory.update({
						where: {
							productId_outletId: {
								productId: data.productId,
								outletId: data.outletId,
							},
						},
						data: {
							quantity: {
								decrement: data.quantity,
							},
							damagedQuantity: {
								increment: data.quantity,
							},
						},
					}),
				]);

				return c.json(damageReport, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to report damaged item",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a damage report
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateDamageSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Update damaged item",
			description: "Update details of an existing damage report",
			responses: {
				200: {
					description: "Damage report updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Damaged item not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if damage report exists
			const existingDamage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!existingDamage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Check if trying to update quantity to more than original
			if (data.quantity && data.quantity > existingDamage.quantity) {
				return c.json(
					{
						error: "Cannot increase damaged quantity in an existing report",
						originalQuantity: existingDamage.quantity,
						requestedQuantity: data.quantity,
					},
					400,
				);
			}

			try {
				// Prepare update data
				const updateData = {
					...data,
					...(data.images && {
						images: JSON.stringify(data.images),
					}),
				};

				// If status is changing to INSPECTED, set inspection details
				if (
					data.status === "INSPECTED" &&
					existingDamage.status !== "INSPECTED"
				) {
					updateData.inspectionDate =
						data.inspectionDate || new Date();
					updateData.inspectedById = data.inspectedById || userId;
				}

				// Update the damage report
				const updatedDamage = await db.damage.update({
					where: { id: damageId },
					data: updateData,
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						outlet: {
							select: {
								id: true,
								name: true,
							},
						},
						reportedBy: {
							select: {
								id: true,
								name: true,
							},
						},
						inspectedBy: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				// If quantity has changed, update inventory
				if (data.quantity && data.quantity < existingDamage.quantity) {
					const quantityDifference =
						existingDamage.quantity - data.quantity;

					await db.inventory.update({
						where: {
							productId_outletId: {
								productId: existingDamage.productId,
								outletId: existingDamage.outletId,
							},
						},
						data: {
							quantity: {
								increment: quantityDifference,
							},
							damagedQuantity: {
								decrement: quantityDifference,
							},
						},
					});
				}

				return c.json(updatedDamage);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update damage report",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a damage report (only if no action has been taken)
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Damage"],
			summary: "Delete damage report",
			description:
				"Delete a damage report that has no repair or scrap actions",
			responses: {
				200: {
					description: "Damage report deleted successfully",
				},
				400: {
					description: "Cannot delete report with existing actions",
				},
				404: {
					description: "Damage report not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");

			// Check if damage report exists
			const damage = await db.damage.findUnique({
				where: { id: damageId },
				include: {
					repairActions: true,
					scrapActions: true,
				},
			});

			if (!damage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Don't allow deletion of reports that have actions taken
			if (
				damage.repairActions.length > 0 ||
				damage.scrapActions.length > 0
			) {
				return c.json(
					{
						error: "Cannot delete a damage report with existing repair or scrap actions",
					},
					400,
				);
			}

			// Only allow deletion of reports in REPORTED or INSPECTED status
			if (!["REPORTED", "INSPECTED"].includes(damage.status)) {
				return c.json(
					{
						error: `Cannot delete a damage report with status '${damage.status}'`,
					},
					400,
				);
			}

			try {
				// Create a transaction to handle both damage report deletion and inventory update
				await db.$transaction([
					// Delete the damage report
					db.damage.delete({
						where: { id: damageId },
					}),
					// Restore the inventory
					db.inventory.update({
						where: {
							productId_outletId: {
								productId: damage.productId,
								outletId: damage.outletId,
							},
						},
						data: {
							quantity: {
								increment: damage.quantity,
							},
							damagedQuantity: {
								decrement: damage.quantity,
							},
						},
					}),
				]);

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete damage report",
						details: error,
					},
					400,
				);
			}
		},
	)
	// REPAIR damaged items
	.post(
		"/:id/repair",
		authMiddleware,
		validator("json", repairActionSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Repair damaged items",
			description: "Record repair actions for damaged items",
			responses: {
				200: {
					description: "Repair action recorded successfully",
				},
				400: {
					description: "Invalid repair data or items not repairable",
				},
				404: {
					description: "Damage report not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if damage report exists
			const damage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!damage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Only allow repairs on items with appropriate status
			if (
				!["INSPECTED", "REPAIRABLE", "REPAIRED"].includes(damage.status)
			) {
				return c.json(
					{
						error: `Cannot repair items with status '${damage.status}'`,
					},
					400,
				);
			}

			// Set default quantity if not provided
			const quantityRepaired = data.quantityRepaired || damage.quantity;

			// Validate quantity to repair
			if (quantityRepaired > damage.quantity) {
				return c.json(
					{
						error: "Repair quantity exceeds damaged quantity",
						damagedQuantity: damage.quantity,
						requestedQuantity: quantityRepaired,
					},
					400,
				);
			}

			try {
				// Create a transaction to handle repair action and inventory/damage status updates
				const [repairAction, updatedDamage] = await db.$transaction([
					// Create repair action
					db.repairAction.create({
						data: {
							damageId,
							notes: data.notes,
							cost: data.cost || 0,
							repairDate: data.repairDate || new Date(),
							completedById: data.completedById || userId,
							status: data.status || "REPAIRED",
							quantityRepaired,
						},
						include: {
							completedBy: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					}),
					// Update damage status
					db.damage.update({
						where: { id: damageId },
						data: {
							status:
								quantityRepaired === damage.quantity
									? "REPAIRED"
									: "PARTIALLY_REPAIRED",
							repairCost: {
								increment: data.cost || 0,
							},
						},
					}),
				]);

				// Update inventory - move from damaged to available
				await db.inventory.update({
					where: {
						productId_outletId: {
							productId: damage.productId,
							outletId: damage.outletId,
						},
					},
					data: {
						quantity: {
							increment: quantityRepaired,
						},
						damagedQuantity: {
							decrement: quantityRepaired,
						},
					},
				});

				return c.json({
					repairAction,
					status: updatedDamage.status,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to record repair action",
						details: error,
					},
					400,
				);
			}
		},
	)
	// SCRAP damaged items
	.post(
		"/:id/scrap",
		authMiddleware,
		validator("json", scrapItemSchema),
		describeRoute({
			tags: ["Damage"],
			summary: "Scrap damaged items",
			description: "Record items as scrapped and remove from inventory",
			responses: {
				200: {
					description: "Items scrapped successfully",
				},
				400: {
					description: "Invalid scrap data",
				},
				404: {
					description: "Damage report not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if damage report exists
			const damage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!damage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Only scrap items in certain statuses
			if (
				!["INSPECTED", "REPAIRABLE", "SCRAPPED"].includes(damage.status)
			) {
				return c.json(
					{
						error: `Cannot scrap items with status '${damage.status}'`,
					},
					400,
				);
			}

			// Set default quantity if not provided
			const quantityScrapped = data.quantityScrapped || damage.quantity;

			// Validate quantity to scrap
			if (quantityScrapped > damage.quantity) {
				return c.json(
					{
						error: "Scrap quantity exceeds damaged quantity",
						damagedQuantity: damage.quantity,
						requestedQuantity: quantityScrapped,
					},
					400,
				);
			}

			try {
				// Create a transaction to handle scrap action and damage status updates
				const [scrapAction, updatedDamage] = await db.$transaction([
					// Create scrap action
					db.scrapAction.create({
						data: {
							damageId,
							notes: data.notes,
							scrapDate: data.scrapDate || new Date(),
							approvedById: data.approvedById || userId,
							quantityScrapped,
							recoveryValue: data.recoveryValue || 0,
						},
						include: {
							approvedBy: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					}),
					// Update damage status
					db.damage.update({
						where: { id: damageId },
						data: {
							status: "SCRAPPED",
							resolvedDate: new Date(),
						},
					}),
				]);

				// Update inventory - remove damaged goods permanently
				await db.inventory.update({
					where: {
						productId_outletId: {
							productId: damage.productId,
							outletId: damage.outletId,
						},
					},
					data: {
						damagedQuantity: {
							decrement: quantityScrapped,
						},
					},
				});

				return c.json({
					scrapAction,
					status: updatedDamage.status,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to record scrap action",
						details: error,
					},
					400,
				);
			}
		},
	)
	// Resolve damaged items (general resolution for damages)
	.post(
		"/:id/resolve",
		authMiddleware,
		validator(
			"json",
			z.object({
				notes: z.string().nonempty("Resolution notes are required"),
				resolvedById: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Damage"],
			summary: "Resolve damage report",
			description:
				"Mark a damage report as resolved without repair or scrapping",
			responses: {
				200: {
					description: "Damage report resolved successfully",
				},
				400: {
					description: "Invalid resolution data",
				},
				404: {
					description: "Damage report not found",
				},
			},
		}),
		async (c) => {
			const damageId = c.req.param("id");
			const { notes, resolvedById } = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if damage report exists
			const damage = await db.damage.findUnique({
				where: { id: damageId },
			});

			if (!damage) {
				return c.json({ error: "Damage report not found" }, 404);
			}

			// Don't allow resolving already resolved reports
			if (["RESOLVED", "SCRAPPED", "REPAIRED"].includes(damage.status)) {
				return c.json(
					{
						error: `Damage report is already resolved with status '${damage.status}'`,
					},
					400,
				);
			}

			try {
				// Update damage report to resolved
				const updatedDamage = await db.damage.update({
					where: { id: damageId },
					data: {
						status: "RESOLVED",
						resolvedDate: new Date(),
						resolvedById: resolvedById || userId,
						actionTaken: notes,
					},
				});

				return c.json(updatedDamage);
			} catch (error) {
				return c.json(
					{
						error: "Failed to resolve damage report",
						details: error,
					},
					400,
				);
			}
		},
	)
	// GET damage statistics
	.get(
		"/stats",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				fromDate: z.string().optional(),
				toDate: z.string().optional(),
				outletId: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Damage"],
			summary: "Get damage statistics",
			description: "Get statistics about damaged inventory for reporting",
			responses: {
				200: {
					description: "Damage statistics",
				},
			},
		}),
		async (c) => {
			const { organizationId, fromDate, toDate, outletId } =
				c.req.valid("query");

			const where = {
				organizationId,
				...(outletId && { outletId }),
			};

			if (fromDate || toDate) {
				where.damageDate = {};
				if (fromDate) where.damageDate.gte = new Date(fromDate);
				if (toDate) where.damageDate.lte = new Date(toDate);
			}

			try {
				// Get damages by status
				const damagesByStatus = await db.damage.groupBy({
					by: ["status"],
					where,
					_count: {
						id: true,
					},
					_sum: {
						quantity: true,
						estimatedCost: true,
					},
				});

				// Get damages by type
				const damagesByType = await db.damage.groupBy({
					by: ["damageType"],
					where,
					_count: {
						id: true,
					},
					_sum: {
						quantity: true,
					},
				});

				// Get damages by severity
				const damagesBySeverity = await db.damage.groupBy({
					by: ["severity"],
					where,
					_count: {
						id: true,
					},
					_sum: {
						quantity: true,
					},
				});

				// Get top 5 most frequently damaged products
				const topDamagedProducts = await db.damage.groupBy({
					by: ["productId"],
					where,
					_count: {
						id: true,
					},
					_sum: {
						quantity: true,
					},
					orderBy: {
						_sum: {
							quantity: "desc",
						},
					},
					take: 5,
				});

				// Get product details for top damaged products
				const productIds = topDamagedProducts.map(
					(item) => item.productId,
				);
				const productDetails = await db.product.findMany({
					where: {
						id: {
							in: productIds,
						},
					},
					select: {
						id: true,
						name: true,
						sku: true,
					},
				});

				// Map product details to the top damaged products
				const topProducts = topDamagedProducts.map((item) => {
					const product = productDetails.find(
						(p) => p.id === item.productId,
					);
					return {
						productId: item.productId,
						productName: product?.name || "Unknown",
						count: item._count.id,
						quantity: item._sum.quantity,
					};
				});

				// Calculate total costs
				const totalDamages = await db.damage.aggregate({
					where,
					_sum: {
						estimatedCost: true,
						repairCost: true,
					},
					_count: {
						id: true,
					},
				});

				// Get total recovered value from scrap actions
				const totalRecovery = await db.scrapAction.aggregate({
					where: {
						damage: {
							...where,
						},
					},
					_sum: {
						recoveryValue: true,
					},
				});

				// Format the results
				return c.json({
					byStatus: formatGroupByResults(damagesByStatus),
					byType: formatGroupByResults(damagesByType),
					bySeverity: formatGroupByResults(damagesBySeverity),
					topDamagedProducts: topProducts,
					totals: {
						count: totalDamages._count.id,
						estimatedCost: totalDamages._sum.estimatedCost || 0,
						repairCost: totalDamages._sum.repairCost || 0,
						recoveryValue: totalRecovery._sum.recoveryValue || 0,
						netLoss:
							(totalDamages._sum.estimatedCost || 0) -
							(totalDamages._sum.repairCost || 0) -
							(totalRecovery._sum.recoveryValue || 0),
					},
					period: {
						from: fromDate ? new Date(fromDate) : null,
						to: toDate ? new Date(toDate) : null,
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch damage statistics",
						details: error,
					},
					500,
				);
			}
		},
	);

// Helper function for statistics
function countByProperty(items, property) {
	return items.reduce((acc, item) => {
		const value = item[property];
		acc[value] = (acc[value] || 0) + 1;
		return acc;
	}, {});
}

// Helper function to format groupBy results
function formatGroupByResults(results) {
	return results.reduce((acc, item) => {
		const key = Object.keys(item).find((k) => !k.startsWith("_"));
		const value = item[key];

		acc[value] = {
			count: item._count.id,
			...(item._sum?.quantity && { quantity: item._sum.quantity }),
			...(item._sum?.estimatedCost && { cost: item._sum.estimatedCost }),
		};

		return acc;
	}, {});
}
