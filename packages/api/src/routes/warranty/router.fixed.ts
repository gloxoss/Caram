import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const warrantyStatusEnum = ["ACTIVE", "EXPIRED", "VOIDED", "CLAIMED"] as const;

const warrantyClaimStatusEnum = [
	"PENDING",
	"APPROVED",
	"REJECTED",
	"PROCESSED",
	"CANCELLED",
] as const;

const claimTypeEnum = ["REPAIR", "REPLACEMENT", "REFUND", "OTHER"] as const;

// Query schema for listing warranties
const warrantyQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	status: z.enum(warrantyStatusEnum).optional(),
	customerId: z.string().optional(),
	productId: z.string().optional(),
	saleId: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
	search: z.string().optional(),
	expired: z.boolean().optional(),
});

// Schema for creating a new warranty
const createWarrantySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	saleId: z.string().optional(),
	saleItemId: z.string().optional(),
	purchaseId: z.string().optional(),
	productId: z.string().nonempty("Product ID is required"),
	productName: z.string().optional(),
	serialNumber: z.string().optional(),
	customerId: z.string().optional(),
	customerName: z.string().optional(),
	startDate: z.string().transform((val) => new Date(val)),
	endDate: z.string().transform((val) => new Date(val)),
	warrantyCoverage: z.string().optional(),
	termsAndConditions: z.string().optional(),
	warrantyNumber: z.string().optional(),
	notes: z.string().optional(),
	extendable: z.boolean().default(false),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
});

// Schema for updating a warranty
const updateWarrantySchema = z.object({
	productId: z.string().optional(),
	productName: z.string().optional(),
	serialNumber: z.string().optional(),
	customerId: z.string().optional(),
	customerName: z.string().optional(),
	startDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	endDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	status: z.enum(warrantyStatusEnum).optional(),
	warrantyCoverage: z.string().optional(),
	termsAndConditions: z.string().optional(),
	warrantyNumber: z.string().optional(),
	notes: z.string().optional(),
	extendable: z.boolean().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
});

// Schema for filing a warranty claim
const fileClaimSchema = z.object({
	description: z.string().nonempty("Description is required"),
	claimType: z.enum(claimTypeEnum),
	claimDate: z.string().transform((val) => new Date(val)),
	attachments: z.array(z.string()).optional(),
	contactName: z.string().optional(),
	contactPhone: z.string().optional(),
	contactEmail: z.string().optional(),
	notes: z.string().optional(),
});

// Schema for updating a claim status
const updateClaimStatusSchema = z.object({
	status: z.enum(warrantyClaimStatusEnum),
	resolutionNotes: z.string().optional(),
	resolutionDate: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	cost: z.number().optional(),
	approvedBy: z.string().optional(),
});

// Schema for extending a warranty
const extendWarrantySchema = z.object({
	extensionMonths: z
		.number()
		.int()
		.positive("Extension period must be positive"),
	newEndDate: z.string().transform((val) => new Date(val)),
	reason: z.string().optional(),
	paymentId: z.string().optional(),
	paymentAmount: z.number().optional(),
});

export const warrantyRouter = new Hono()
	.basePath("/warranty")
	// GET all warranties
	.get(
		"/",
		authMiddleware,
		validator("query", warrantyQuerySchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "List all warranties",
			description:
				"Retrieve a list of product warranties with optional filtering",
			responses: {
				200: {
					description: "List of warranties",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				status,
				customerId,
				productId,
				saleId,
				fromDate,
				toDate,
				search,
				expired,
			} = c.req.valid("query");

			const where = {
				organizationId,
				...(status && { status }),
				...(customerId && { customerId }),
				...(productId && { productId }),
				...(saleId && { saleId }),
			};

			if (fromDate || toDate) {
				where.createdAt = {};
				if (fromDate) where.createdAt.gte = new Date(fromDate);
				if (toDate) where.createdAt.lte = new Date(toDate);
			}

			// Filter for expired/active warranties based on endDate
			if (expired !== undefined) {
				const today = new Date();
				where.endDate = expired ? { lt: today } : { gte: today };
			}

			if (search) {
				where.OR = [
					{
						warrantyNumber: {
							contains: search,
							mode: "insensitive",
						},
					},
					{ productName: { contains: search, mode: "insensitive" } },
					{ customerName: { contains: search, mode: "insensitive" } },
					{ serialNumber: { contains: search, mode: "insensitive" } },
				];
			}

			try {
				const warranties = await db.warranty.findMany({
					where,
					orderBy: { createdAt: "desc" },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						customer: {
							select: {
								id: true,
								name: true,
								contact: true,
							},
						},
						claims: {
							select: {
								id: true,
								claimDate: true,
								status: true,
								claimType: true,
							},
						},
					},
				});

				// Add status calculations
				const warrantiesWithMeta = warranties.map((warranty) => {
					const today = new Date();
					const daysRemaining = Math.ceil(
						(warranty.endDate.getTime() - today.getTime()) /
							(1000 * 60 * 60 * 24),
					);

					const isExpired = today > warranty.endDate;
					const activeClaims = warranty.claims.filter(
						(claim) =>
							!["REJECTED", "CANCELLED", "PROCESSED"].includes(
								claim.status,
							),
					).length;

					return {
						...warranty,
						meta: {
							daysRemaining: isExpired ? 0 : daysRemaining,
							isExpired,
							activeClaims,
							claimsCount: warranty.claims.length,
						},
					};
				});

				return c.json(warrantiesWithMeta);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch warranties",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a specific warranty by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Warranty"],
			summary: "Get warranty details",
			description:
				"Retrieve detailed information about a specific warranty",
			responses: {
				200: {
					description: "Warranty details",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");

			try {
				const warranty = await db.warranty.findUnique({
					where: { id: warrantyId },
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
								description: true,
								category: true,
								brand: true,
							},
						},
						customer: {
							select: {
								id: true,
								name: true,
								contact: true,
								email: true,
							},
						},
						claims: {
							orderBy: { claimDate: "desc" },
							include: {
								attachments: true,
								resolutionDetails: true,
							},
						},
						createdBy: {
							select: {
								id: true,
								name: true,
							},
						},
						saleItem: {
							select: {
								id: true,
								productName: true,
								quantity: true,
								price: true,
								sale: {
									select: {
										id: true,
										invoiceNo: true,
										date: true,
									},
								},
							},
						},
					},
				});

				if (!warranty) {
					return c.json({ error: "Warranty not found" }, 404);
				}

				// Calculate additional metadata
				const today = new Date();
				const daysRemaining = Math.ceil(
					(warranty.endDate.getTime() - today.getTime()) /
						(1000 * 60 * 60 * 24),
				);

				const isExpired = today > warranty.endDate;
				const activeClaims = warranty.claims.filter(
					(claim) =>
						!["REJECTED", "CANCELLED", "PROCESSED"].includes(
							claim.status,
						),
				).length;

				const warrantyWithMeta = {
					...warranty,
					meta: {
						daysRemaining: isExpired ? 0 : daysRemaining,
						isExpired,
						activeClaims,
						claimsCount: warranty.claims.length,
						warrantyAge: Math.ceil(
							(today.getTime() - warranty.startDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
						totalDuration: Math.ceil(
							(warranty.endDate.getTime() -
								warranty.startDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
					},
				};

				return c.json(warrantyWithMeta);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch warranty",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new warranty
	.post(
		"/",
		authMiddleware,
		validator("json", createWarrantySchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "Create a new warranty",
			description: "Register a new product warranty",
			responses: {
				201: {
					description: "Warranty created successfully",
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
				});

				if (!product) {
					return c.json({ error: "Product not found" }, 404);
				}

				// Validate customer if provided
				if (data.customerId) {
					const customer = await db.customer.findUnique({
						where: { id: data.customerId },
					});
					if (!customer) {
						return c.json({ error: "Customer not found" }, 404);
					}
				}

				// Generate a warranty number if not provided
				if (!data.warrantyNumber) {
					data.warrantyNumber = `WR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
				}

				// Create the warranty
				const warranty = await db.warranty.create({
					data: {
						...data,
						productName: data.productName || product.name,
						status: "ACTIVE",
						createdById: userId,
						metadata: data.metadata
							? JSON.stringify(data.metadata)
							: null,
						tags: data.tags ? JSON.stringify(data.tags) : null,
					},
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						customer: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json(warranty, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create warranty",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a warranty
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateWarrantySchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "Update a warranty",
			description: "Update details of an existing warranty",
			responses: {
				200: {
					description: "Warranty updated successfully",
				},
				400: {
					description: "Cannot update a voided or claimed warranty",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if warranty exists
			const warranty = await db.warranty.findUnique({
				where: { id: warrantyId },
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			// Don't allow updates to voided or claimed warranties
			if (["VOIDED", "CLAIMED"].includes(warranty.status)) {
				return c.json(
					{
						error: `Cannot update a ${warranty.status.toLowerCase()} warranty`,
					},
					400,
				);
			}

			try {
				// If product is being updated, validate it exists
				if (data.productId) {
					const product = await db.product.findUnique({
						where: { id: data.productId },
					});
					if (!product) {
						return c.json({ error: "Product not found" }, 404);
					}
				}

				// If customer is being updated, validate they exist
				if (data.customerId) {
					const customer = await db.customer.findUnique({
						where: { id: data.customerId },
					});
					if (!customer) {
						return c.json({ error: "Customer not found" }, 404);
					}
				}

				// Prepare update data
				const updateData = {
					...data,
					...(data.metadata && {
						metadata: JSON.stringify(data.metadata),
					}),
					...(data.tags && {
						tags: JSON.stringify(data.tags),
					}),
				};

				// Update warranty
				const updatedWarranty = await db.warranty.update({
					where: { id: warrantyId },
					data: updateData,
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						customer: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json(updatedWarranty);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update warranty",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a warranty
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Warranty"],
			summary: "Delete a warranty",
			description: "Delete a warranty that has no claims",
			responses: {
				200: {
					description: "Warranty deleted successfully",
				},
				400: {
					description: "Cannot delete a warranty with claims",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");

			// Check if warranty exists
			const warranty = await db.warranty.findUnique({
				where: { id: warrantyId },
				include: {
					claims: true,
				},
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			// Check if warranty has claims
			if (warranty.claims.length > 0) {
				return c.json(
					{
						error: "Cannot delete a warranty with existing claims",
					},
					400,
				);
			}

			try {
				// Delete the warranty
				await db.warranty.delete({
					where: { id: warrantyId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete warranty",
						details: error,
					},
					400,
				);
			}
		},
	)
	// VOID a warranty
	.post(
		"/:id/void",
		authMiddleware,
		validator(
			"json",
			z.object({
				reason: z.string().nonempty("Reason is required"),
			}),
		),
		describeRoute({
			tags: ["Warranty"],
			summary: "Void a warranty",
			description: "Void an active warranty",
			responses: {
				200: {
					description: "Warranty voided successfully",
				},
				400: {
					description: "Warranty is not active",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");
			const { reason } = c.req.valid("json");

			// Check if warranty exists
			const warranty = await db.warranty.findUnique({
				where: { id: warrantyId },
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			// Only allow voiding active warranties
			if (warranty.status !== "ACTIVE") {
				return c.json(
					{
						error: "Only active warranties can be voided",
					},
					400,
				);
			}

			try {
				// Update warranty to voided
				const updatedWarranty = await db.warranty.update({
					where: { id: warrantyId },
					data: {
						status: "VOIDED",
						notes: warranty.notes
							? `${warranty.notes}\nVoid reason: ${reason}`
							: `Void reason: ${reason}`,
					},
				});

				return c.json(updatedWarranty);
			} catch (error) {
				return c.json(
					{
						error: "Failed to void warranty",
						details: error,
					},
					400,
				);
			}
		},
	)
	// FILE a warranty claim
	.post(
		"/:id/claim",
		authMiddleware,
		validator("json", fileClaimSchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "File a warranty claim",
			description: "Create a new claim against an active warranty",
			responses: {
				201: {
					description: "Warranty claim filed successfully",
				},
				400: {
					description: "Warranty is not active or is expired",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if warranty exists
			const warranty = await db.warranty.findUnique({
				where: { id: warrantyId },
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			// Check if warranty is active
			if (warranty.status !== "ACTIVE") {
				return c.json(
					{
						error: `Cannot file a claim against a ${warranty.status.toLowerCase()} warranty`,
					},
					400,
				);
			}

			// Check if warranty is expired
			const today = new Date();
			if (today > warranty.endDate) {
				return c.json(
					{
						error: "Cannot file a claim against an expired warranty",
					},
					400,
				);
			}

			try {
				// Create claim
				const claim = await db.warrantyClaim.create({
					data: {
						warrantyId,
						description: data.description,
						claimType: data.claimType,
						claimDate: data.claimDate,
						status: "PENDING",
						contactName: data.contactName,
						contactPhone: data.contactPhone,
						contactEmail: data.contactEmail,
						notes: data.notes,
						createdById: userId,
						attachments: {
							create:
								data.attachments?.map((url) => ({
									url,
									type: "CLAIM_DOCUMENT",
								})) || [],
						},
					},
					include: {
						attachments: true,
					},
				});

				return c.json(claim, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to file warranty claim",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a claim status
	.put(
		"/claim/:id",
		authMiddleware,
		validator("json", updateClaimStatusSchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "Update claim status",
			description: "Update the status of a warranty claim",
			responses: {
				200: {
					description: "Claim status updated successfully",
				},
				404: {
					description: "Claim not found",
				},
			},
		}),
		async (c) => {
			const claimId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if claim exists
			const claim = await db.warrantyClaim.findUnique({
				where: { id: claimId },
				include: {
					warranty: true,
				},
			});

			if (!claim) {
				return c.json({ error: "Warranty claim not found" }, 404);
			}

			try {
				// Create resolution details if provided
				let resolutionId = null;
				if (
					data.status === "APPROVED" ||
					data.status === "REJECTED" ||
					data.status === "PROCESSED"
				) {
					const resolution = await db.claimResolution.create({
						data: {
							status: data.status,
							notes: data.resolutionNotes || null,
							resolutionDate: data.resolutionDate || new Date(),
							cost: data.cost || 0,
							resolvedById: userId,
							approvedById: data.approvedBy || userId,
						},
					});
					resolutionId = resolution.id;
				}

				// Update claim status
				const updatedClaim = await db.warrantyClaim.update({
					where: { id: claimId },
					data: {
						status: data.status,
						resolutionId,
						updatedAt: new Date(),
					},
					include: {
						warranty: true,
						resolutionDetails: true,
					},
				});

				// If claim is processed and was approved, mark warranty as claimed
				if (
					data.status === "PROCESSED" &&
					updatedClaim.status === "APPROVED"
				) {
					await db.warranty.update({
						where: { id: claim.warrantyId },
						data: {
							status: "CLAIMED",
						},
					});
				}

				return c.json(updatedClaim);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update claim status",
						details: error,
					},
					400,
				);
			}
		},
	)
	// EXTEND a warranty
	.post(
		"/:id/extend",
		authMiddleware,
		validator("json", extendWarrantySchema),
		describeRoute({
			tags: ["Warranty"],
			summary: "Extend a warranty",
			description: "Extend the period of an active warranty",
			responses: {
				200: {
					description: "Warranty extended successfully",
				},
				400: {
					description: "Warranty cannot be extended",
				},
				404: {
					description: "Warranty not found",
				},
			},
		}),
		async (c) => {
			const warrantyId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if warranty exists
			const warranty = await db.warranty.findUnique({
				where: { id: warrantyId },
			});

			if (!warranty) {
				return c.json({ error: "Warranty not found" }, 404);
			}

			// Check if warranty is active and extendable
			if (warranty.status !== "ACTIVE") {
				return c.json(
					{
						error: `Cannot extend a ${warranty.status.toLowerCase()} warranty`,
					},
					400,
				);
			}

			if (!warranty.extendable) {
				return c.json(
					{
						error: "This warranty is not extendable",
					},
					400,
				);
			}

			try {
				// Create extension record
				const extension = await db.warrantyExtension.create({
					data: {
						warrantyId,
						originalEndDate: warranty.endDate,
						newEndDate: data.newEndDate,
						extensionMonths: data.extensionMonths,
						reason: data.reason,
						paymentId: data.paymentId,
						paymentAmount: data.paymentAmount,
						createdById: userId,
					},
				});

				// Update warranty end date
				const updatedWarranty = await db.warranty.update({
					where: { id: warrantyId },
					data: {
						endDate: data.newEndDate,
						notes: data.reason
							? warranty.notes
								? `${warranty.notes}\nExtension reason: ${data.reason}`
								: `Extension reason: ${data.reason}`
							: warranty.notes,
					},
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						customer: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json({
					warranty: updatedWarranty,
					extension,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to extend warranty",
						details: error,
					},
					400,
				);
			}
		},
	)
	// CHECK expired warranties
	.get(
		"/check-expired",
		authMiddleware,
		describeRoute({
			tags: ["Warranty"],
			summary: "Check for expired warranties",
			description:
				"Identify and mark warranties that are past their end date as expired",
			responses: {
				200: {
					description: "Expired check completed",
				},
			},
		}),
		async (c) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Start of today

			try {
				// Find all active warranties with end dates before today
				const expiredWarranties = await db.warranty.findMany({
					where: {
						status: "ACTIVE",
						endDate: {
							lt: today,
						},
					},
				});

				// Update all expired warranties
				const updatePromises = expiredWarranties.map((warranty) =>
					db.warranty.update({
						where: { id: warranty.id },
						data: {
							status: "EXPIRED",
						},
					}),
				);

				await Promise.all(updatePromises);

				return c.json({
					message: "Expired warranty check completed",
					expiredCount: expiredWarranties.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to check for expired warranties",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET claim statistics
	.get(
		"/stats/claims",
		authMiddleware,
		validator(
			"query",
			z.object({
				organizationId: z
					.string()
					.nonempty("Organization ID is required"),
				fromDate: z.string().optional(),
				toDate: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Warranty"],
			summary: "Get warranty claim statistics",
			description: "Get statistics about warranty claims for reporting",
			responses: {
				200: {
					description: "Claim statistics",
				},
			},
		}),
		async (c) => {
			const { organizationId, fromDate, toDate } = c.req.valid("query");

			const dateFilter = {};
			if (fromDate || toDate) {
				dateFilter.claimDate = {};
				if (fromDate) dateFilter.claimDate.gte = new Date(fromDate);
				if (toDate) dateFilter.claimDate.lte = new Date(toDate);
			}

			try {
				// Get claims by status
				const claimsByStatus = await db.warrantyClaim.groupBy({
					by: ["status"],
					where: {
						warranty: {
							organizationId,
						},
						...dateFilter,
					},
					_count: {
						id: true,
					},
				});

				// Get claims by type
				const claimsByType = await db.warrantyClaim.groupBy({
					by: ["claimType"],
					where: {
						warranty: {
							organizationId,
						},
						...dateFilter,
					},
					_count: {
						id: true,
					},
				});

				// Get total claims and costs
				const totalClaims = await db.warrantyClaim.count({
					where: {
						warranty: {
							organizationId,
						},
						...dateFilter,
					},
				});

				const resolutionCosts = await db.claimResolution.aggregate({
					_sum: {
						cost: true,
					},
					where: {
						claim: {
							warranty: {
								organizationId,
							},
						},
						...(fromDate || toDate
							? {
									resolutionDate: dateFilter.claimDate,
								}
							: {}),
					},
				});

				// Format the results
				const statusStats = Object.fromEntries(
					claimsByStatus.map((item) => [item.status, item._count.id]),
				);

				const typeStats = Object.fromEntries(
					claimsByType.map((item) => [
						item.claimType,
						item._count.id,
					]),
				);

				return c.json({
					totalClaims,
					byStatus: statusStats,
					byType: typeStats,
					totalCost: resolutionCosts._sum.cost || 0,
					period: {
						from: fromDate ? new Date(fromDate) : null,
						to: toDate ? new Date(toDate) : null,
					},
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch claim statistics",
						details: error,
					},
					500,
				);
			}
		},
	);