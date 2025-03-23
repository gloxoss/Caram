import type { Prisma, Promotion } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const promotionsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	active: z.coerce.boolean().optional(),
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const promotionIdParamSchema = z.object({
	id: z.string().nonempty("Promotion ID is required"),
});

const createPromotionSchema = z
	.object({
		organizationId: z.string().nonempty("Organization ID is required"),
		name: z.string().min(1, "Name is required"),
		description: z.string().optional(),
		discount: z
			.number()
			.min(0, "Discount cannot be negative")
			.max(100, "Maximum discount is 100%"),
		startDate: z
			.string()
			.datetime({ message: "Valid ISO datetime required" }),
		endDate: z
			.string()
			.datetime({ message: "Valid ISO datetime required" }),
		isPercentage: z.boolean().optional().default(true),
		code: z.string().optional(),
		minPurchaseAmount: z.number().min(0).optional(),
		maxDiscountAmount: z.number().min(0).optional(),
		limitPerCustomer: z.number().int().min(0).optional(),
		productIds: z.array(z.string()).optional(), // For product-specific promotions
		categoryIds: z.array(z.string()).optional(), // For category-specific promotions
		customerGroupIds: z.array(z.string()).optional(), // For customer group specific promotions
	})
	.refine(
		(data) => {
			// Ensure end date is after start date
			return new Date(data.endDate) > new Date(data.startDate);
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	);

const updatePromotionSchema = z
	.object({
		name: z.string().min(1, "Name is required").optional(),
		description: z.string().optional(),
		discount: z
			.number()
			.min(0, "Discount cannot be negative")
			.max(100, "Maximum discount is 100%")
			.optional(),
		startDate: z
			.string()
			.datetime({ message: "Valid ISO datetime required" })
			.optional(),
		endDate: z
			.string()
			.datetime({ message: "Valid ISO datetime required" })
			.optional(),
		isPercentage: z.boolean().optional(),
		code: z.string().optional(),
		minPurchaseAmount: z.number().min(0).optional(),
		maxDiscountAmount: z.number().min(0).optional(),
		limitPerCustomer: z.number().int().min(0).optional(),
		productIds: z.array(z.string()).optional(),
		categoryIds: z.array(z.string()).optional(),
		customerGroupIds: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			// Skip validation if both dates aren't present
			if (!data.startDate || !data.endDate) return true;
			// Ensure end date is after start date
			return new Date(data.endDate) > new Date(data.startDate);
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	);

// Validation schema for checking if a promotion is applicable
const validatePromotionSchema = z
	.object({
		promotionId: z.string().optional(),
		promotionCode: z.string().optional(),
		organizationId: z.string().nonempty("Organization ID is required"),
		customerId: z.string().optional(),
		totalAmount: z.number().min(0, "Total amount is required"),
		items: z.array(
			z.object({
				productId: z.string(),
				quantity: z.number().min(1),
				price: z.number().min(0),
			}),
		),
	})
	.refine(
		(data) => {
			// Either promotionId or promotionCode must be provided
			return (
				data.promotionId !== undefined ||
				data.promotionCode !== undefined
			);
		},
		{
			message: "Either promotion ID or promotion code must be provided",
			path: ["promotionId"],
		},
	);

export const promotionRouter = new Hono()
	.basePath("/promotions")
	// GET all promotions
	.get(
		"/",
		authMiddleware,
		validator("query", promotionsQuerySchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "List all promotions for an organization",
			description:
				"Retrieve a list of promotions with optional filtering by active status and search term",
			responses: {
				200: {
					description: "List of promotions",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									promotions: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												description: { type: "string" },
												discount: { type: "number" },
												startDate: {
													type: "string",
													format: "date-time",
												},
												endDate: {
													type: "string",
													format: "date-time",
												},
												isActive: { type: "boolean" },
												organizationId: {
													type: "string",
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
					description: "Invalid or missing parameters",
				},
			},
		}),
		async (c) => {
			const { organizationId, active, search, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: Prisma.PromotionWhereInput = { organizationId };

			// Add active filter if provided
			if (active !== undefined) {
				const now = new Date();
				if (active) {
					// Active promotions: current date is between start and end dates
					where.startDate = { lte: now };
					where.endDate = { gte: now };
				} else {
					// Inactive promotions: either not started or already ended
					where.OR = [
						{ startDate: { gt: now } },
						{ endDate: { lt: now } },
					];
				}
			}

			// Add search if provided
			if (search) {
				where.OR = [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
					...(where.OR || []),
				];
			}

			// Get promotions with pagination
			const [promotions, total] = await Promise.all([
				db.promotion.findMany({
					where,
					orderBy: { startDate: "desc" },
					take: limit,
					skip: offset,
				}),
				db.promotion.count({ where }),
			]);

			// Add isActive flag to each promotion
			const now = new Date();
			const promotionsWithActiveStatus = promotions.map((promotion) => ({
				...promotion,
				isActive:
					promotion.startDate <= now && promotion.endDate >= now,
			}));

			return c.json({ promotions: promotionsWithActiveStatus, total });
		},
	)
	// GET a single promotion by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", promotionIdParamSchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "Get promotion details",
			description:
				"Retrieve detailed information about a specific promotion",
			responses: {
				200: {
					description: "Promotion details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									discount: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
									isActive: { type: "boolean" },
									organizationId: { type: "string" },
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
					description: "Promotion not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const promotion = await db.promotion.findUnique({
				where: { id },
			});

			if (!promotion) {
				return c.json({ error: "Promotion not found" }, 404);
			}

			// Add isActive flag
			const now = new Date();
			const isActive =
				promotion.startDate <= now && promotion.endDate >= now;

			return c.json({
				...promotion,
				isActive,
			});
		},
	)
	// CREATE a new promotion
	.post(
		"/",
		authMiddleware,
		validator("json", createPromotionSchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "Create a new promotion",
			description: "Create a new discount or offer promotion",
			responses: {
				201: {
					description: "Promotion created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									discount: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
									organizationId: { type: "string" },
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

			// Extract fields that don't match the Promotion model schema
			const {
				isPercentage,
				code,
				minPurchaseAmount,
				maxDiscountAmount,
				limitPerCustomer,
				productIds,
				categoryIds,
				customerGroupIds,
				...promotionData
			} = data;

			// Convert date strings to Date objects
			const parsedData = {
				...promotionData,
				startDate: new Date(promotionData.startDate),
				endDate: new Date(promotionData.endDate),
			};

			// Create the promotion
			const promotion = await db.promotion.create({
				data: parsedData,
			});

			return c.json(promotion, 201);
		},
	)
	// UPDATE a promotion
	.put(
		"/:id",
		authMiddleware,
		validator("param", promotionIdParamSchema),
		validator("json", updatePromotionSchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "Update a promotion",
			description: "Update details of an existing promotion",
			responses: {
				200: {
					description: "Promotion updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									discount: { type: "number" },
									startDate: {
										type: "string",
										format: "date-time",
									},
									endDate: {
										type: "string",
										format: "date-time",
									},
									organizationId: { type: "string" },
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
					description: "Promotion not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Extract fields that don't match the Promotion model schema
			const {
				isPercentage,
				code,
				minPurchaseAmount,
				maxDiscountAmount,
				limitPerCustomer,
				productIds,
				categoryIds,
				customerGroupIds,
				...promotionData
			} = data;

			// Convert date strings to Date objects if present
			const parsedData: Prisma.PromotionUpdateInput = {
				...promotionData,
			};
			if (parsedData.startDate) {
				parsedData.startDate = new Date(parsedData.startDate as string);
			}
			if (parsedData.endDate) {
				parsedData.endDate = new Date(parsedData.endDate as string);
			}

			try {
				const promotion = await db.promotion.update({
					where: { id },
					data: parsedData,
				});

				return c.json(promotion);
			} catch (error) {
				return c.json({ error: "Promotion not found" }, 404);
			}
		},
	)
	// DELETE a promotion
	.delete(
		"/:id",
		authMiddleware,
		validator("param", promotionIdParamSchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "Delete a promotion",
			description: "Delete an existing promotion",
			responses: {
				200: {
					description: "Promotion deleted successfully",
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
					description: "Promotion not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.promotion.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Promotion deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Promotion not found" }, 404);
			}
		},
	)
	// GET active promotions
	.get(
		"/active",
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
			tags: ["Promotions"],
			summary: "Get active promotions",
			description:
				"Retrieve all currently active promotions for an organization",
			responses: {
				200: {
					description: "Active promotions",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									promotions: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												description: { type: "string" },
												discount: { type: "number" },
												startDate: {
													type: "string",
													format: "date-time",
												},
												endDate: {
													type: "string",
													format: "date-time",
												},
												organizationId: {
													type: "string",
												},
											},
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
			const { organizationId } = c.req.valid("query");
			const now = new Date();

			const activePromotions = await db.promotion.findMany({
				where: {
					organizationId,
					startDate: { lte: now },
					endDate: { gte: now },
				},
				orderBy: { discount: "desc" },
			});

			return c.json({ promotions: activePromotions });
		},
	)
	// VALIDATE a promotion
	.post(
		"/validate",
		authMiddleware,
		validator("json", validatePromotionSchema),
		describeRoute({
			tags: ["Promotions"],
			summary: "Validate a promotion",
			description:
				"Check if a promotion is applicable to the current cart/sale",
			responses: {
				200: {
					description: "Promotion validation result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									valid: { type: "boolean" },
									discount: { type: "number" },
									discountAmount: { type: "number" },
									message: { type: "string" },
									promotion: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
											discount: { type: "number" },
										},
									},
								},
							},
						},
					},
				},
				404: {
					description: "Promotion not found",
				},
				400: {
					description: "Invalid promotion or parameters",
				},
			},
		}),
		async (c) => {
			const {
				promotionId,
				promotionCode,
				organizationId,
				customerId,
				totalAmount,
				items,
			} = c.req.valid("json");

			// Find the promotion by ID or code
			let promotion: Promotion | null = null;
			if (promotionId) {
				promotion = await db.promotion.findUnique({
					where: { id: promotionId },
				});
			} else if (promotionCode) {
				// Note: In a real implementation, you would have a 'code' field in the Promotion model
				// For now, we'll just return a mock response
				return c.json(
					{
						valid: false,
						discount: 0,
						discountAmount: 0,
						message: "Promotion code not found or invalid",
					},
					404,
				);
			}

			if (!promotion) {
				return c.json(
					{
						valid: false,
						discount: 0,
						discountAmount: 0,
						message: "Promotion not found",
					},
					404,
				);
			}

			// Check if promotion belongs to the specified organization
			if (promotion.organizationId !== organizationId) {
				return c.json(
					{
						valid: false,
						discount: 0,
						discountAmount: 0,
						message: "Promotion not valid for this organization",
					},
					400,
				);
			}

			// Check if promotion is active
			const now = new Date();
			if (promotion.startDate > now || promotion.endDate < now) {
				return c.json(
					{
						valid: false,
						discount: 0,
						discountAmount: 0,
						message: "Promotion is not active",
					},
					400,
				);
			}

			// Calculate the discount amount
			const discountAmount = (promotion.discount / 100) * totalAmount;

			return c.json({
				valid: true,
				discount: promotion.discount,
				discountAmount,
				message: "Promotion applied successfully",
				promotion: {
					id: promotion.id,
					name: promotion.name,
					discount: promotion.discount,
				},
			});
		},
	);
