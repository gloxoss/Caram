import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const deliveryPartnerStatusEnum = [
	"ACTIVE",
	"INACTIVE",
	"PENDING",
	"SUSPENDED",
] as const;

const deliveryMethodEnum = [
	"ROAD",
	"AIR",
	"SEA",
	"RAIL",
	"EXPRESS",
	"STANDARD",
	"ECONOMY",
] as const;

// Schema for listing delivery partners
const deliveryPartnersQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	status: z.enum(deliveryPartnerStatusEnum).optional(),
	search: z.string().optional(),
});

// Schema for creating a delivery partner
const createDeliveryPartnerSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Name is required"),
	code: z.string().optional(),
	contactPerson: z.string().optional(),
	email: z.string().email("Invalid email").optional(),
	phone: z.string().optional(),
	website: z.string().url("Invalid URL").optional(),
	address: z.string().optional(),
	logo: z.string().optional(),
	status: z.enum(deliveryPartnerStatusEnum).default("ACTIVE"),
	supportedMethods: z.array(z.enum(deliveryMethodEnum)).optional(),
	trackingUrlTemplate: z.string().optional(),
	apiEndpoint: z.string().optional(),
	apiKey: z.string().optional(),
	apiSecret: z.string().optional(),
	notes: z.string().optional(),
	serviceAreas: z.array(z.string()).optional(),
	settings: z.record(z.any()).optional(),
	customFields: z.record(z.any()).optional(),
});

// Schema for updating a delivery partner
const updateDeliveryPartnerSchema = z.object({
	name: z.string().optional(),
	code: z.string().optional(),
	contactPerson: z.string().optional(),
	email: z.string().email("Invalid email").optional(),
	phone: z.string().optional(),
	website: z.string().url("Invalid URL").optional(),
	address: z.string().optional(),
	logo: z.string().optional(),
	status: z.enum(deliveryPartnerStatusEnum).optional(),
	supportedMethods: z.array(z.enum(deliveryMethodEnum)).optional(),
	trackingUrlTemplate: z.string().optional(),
	apiEndpoint: z.string().optional(),
	apiKey: z.string().optional(),
	apiSecret: z.string().optional(),
	notes: z.string().optional(),
	serviceAreas: z.array(z.string()).optional(),
	settings: z.record(z.any()).optional(),
	customFields: z.record(z.any()).optional(),
});

// Schema for creating a shipping rate
const createShippingRateSchema = z.object({
	deliveryPartnerId: z.string().nonempty("Delivery partner ID is required"),
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Name is required"),
	method: z.enum(deliveryMethodEnum),
	baseRate: z.number().nonnegative("Base rate must be a positive number"),
	perKgRate: z
		.number()
		.nonnegative("Per kg rate must be a positive number")
		.optional(),
	minWeight: z
		.number()
		.nonnegative("Minimum weight must be a positive number")
		.optional(),
	maxWeight: z
		.number()
		.nonnegative("Maximum weight must be a positive number")
		.optional(),
	fromLocation: z.string().optional(),
	toLocation: z.string().optional(),
	estimatedDeliveryDays: z
		.number()
		.int()
		.nonnegative("Estimated delivery days must be a positive integer")
		.optional(),
	isActive: z.boolean().default(true),
	conditions: z.record(z.any()).optional(),
});

// Schema for updating a shipping rate
const updateShippingRateSchema = z.object({
	name: z.string().optional(),
	method: z.enum(deliveryMethodEnum).optional(),
	baseRate: z
		.number()
		.nonnegative("Base rate must be a positive number")
		.optional(),
	perKgRate: z
		.number()
		.nonnegative("Per kg rate must be a positive number")
		.optional(),
	minWeight: z
		.number()
		.nonnegative("Minimum weight must be a positive number")
		.optional(),
	maxWeight: z
		.number()
		.nonnegative("Maximum weight must be a positive number")
		.optional(),
	fromLocation: z.string().optional(),
	toLocation: z.string().optional(),
	estimatedDeliveryDays: z
		.number()
		.int()
		.nonnegative("Estimated delivery days must be a positive integer")
		.optional(),
	isActive: z.boolean().optional(),
	conditions: z.record(z.any()).optional(),
});

// Schema for calculating shipping rates
const calculateRateSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	deliveryPartnerId: z.string().optional(),
	fromLocation: z.string().optional(),
	toLocation: z.string().nonempty("Destination is required"),
	weight: z.number().nonnegative("Weight must be a positive number"),
	dimensions: z
		.object({
			length: z.number().nonnegative().optional(),
			width: z.number().nonnegative().optional(),
			height: z.number().nonnegative().optional(),
		})
		.optional(),
	declaredValue: z.number().nonnegative().optional(),
	method: z.enum(deliveryMethodEnum).optional(),
});

export const deliveryPartnerRouter = new Hono()
	.basePath("/delivery-partners")
	// GET all delivery partners
	.get(
		"/",
		authMiddleware,
		validator("query", deliveryPartnersQuerySchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "List delivery partners",
			description: "Get delivery partners with optional filtering",
			responses: {
				200: {
					description: "List of delivery partners",
				},
			},
		}),
		async (c) => {
			const { organizationId, status, search } = c.req.valid("query");

			try {
				const whereClause: any = { organizationId };

				if (status) {
					whereClause.status = status;
				}

				if (search) {
					whereClause.OR = [
						{ name: { contains: search, mode: "insensitive" } },
						{ code: { contains: search, mode: "insensitive" } },
						{
							contactPerson: {
								contains: search,
								mode: "insensitive",
							},
						},
						{ email: { contains: search, mode: "insensitive" } },
					];
				}

				const deliveryPartners = await db.deliveryPartner.findMany({
					where: whereClause,
					orderBy: { name: "asc" },
				});

				return c.json({
					items: deliveryPartners,
					count: deliveryPartners.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch delivery partners",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET delivery partner by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Get delivery partner",
			description:
				"Get detailed information about a specific delivery partner",
			responses: {
				200: {
					description: "Delivery partner details",
				},
				404: {
					description: "Delivery partner not found",
				},
			},
		}),
		async (c) => {
			const partnerId = c.req.param("id");

			try {
				const deliveryPartner = await db.deliveryPartner.findUnique({
					where: { id: partnerId },
					include: {
						shippingRates: {
							orderBy: { name: "asc" },
						},
					},
				});

				if (!deliveryPartner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Mask API credentials
				if (deliveryPartner.apiKey) {
					deliveryPartner.apiKey = "********";
				}
				if (deliveryPartner.apiSecret) {
					deliveryPartner.apiSecret = "********";
				}

				return c.json(deliveryPartner);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch delivery partner details",
						details: error,
					},
					500,
				);
			}
		},
	)
	// POST create delivery partner
	.post(
		"/",
		authMiddleware,
		validator("json", createDeliveryPartnerSchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Create delivery partner",
			description: "Create a new delivery partner",
			responses: {
				201: {
					description: "Delivery partner created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Generate a code if not provided
				if (!data.code) {
					data.code = data.name
						.toUpperCase()
						.replace(/[^A-Z0-9]/g, "")
						.substring(0, 10)
						.padEnd(3, "X");
				}

				// Create delivery partner
				const deliveryPartner = await db.deliveryPartner.create({
					data: {
						...data,
						createdById: userId,
					},
				});

				// Mask API credentials in response
				if (deliveryPartner.apiKey) {
					deliveryPartner.apiKey = "********";
				}
				if (deliveryPartner.apiSecret) {
					deliveryPartner.apiSecret = "********";
				}

				return c.json(deliveryPartner, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create delivery partner",
						details: error,
					},
					400,
				);
			}
		},
	)
	// PUT update delivery partner
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateDeliveryPartnerSchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Update delivery partner",
			description: "Update an existing delivery partner",
			responses: {
				200: {
					description: "Delivery partner updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Delivery partner not found",
				},
			},
		}),
		async (c) => {
			const partnerId = c.req.param("id");
			const data = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Check if delivery partner exists
				const existingPartner = await db.deliveryPartner.findUnique({
					where: { id: partnerId },
				});

				if (!existingPartner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Update delivery partner
				const updatedPartner = await db.deliveryPartner.update({
					where: { id: partnerId },
					data: {
						...data,
						updatedById: userId,
						updatedAt: new Date(),
					},
				});

				// Mask API credentials in response
				if (updatedPartner.apiKey) {
					updatedPartner.apiKey = "********";
				}
				if (updatedPartner.apiSecret) {
					updatedPartner.apiSecret = "********";
				}

				return c.json(updatedPartner);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update delivery partner",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE delivery partner
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Delete delivery partner",
			description: "Delete a delivery partner",
			responses: {
				200: {
					description: "Delivery partner deleted successfully",
				},
				400: {
					description:
						"Cannot delete delivery partner with active shipments",
				},
				404: {
					description: "Delivery partner not found",
				},
			},
		}),
		async (c) => {
			const partnerId = c.req.param("id");

			try {
				// Check if delivery partner exists
				const partner = await db.deliveryPartner.findUnique({
					where: { id: partnerId },
				});

				if (!partner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Check if there are active shipments
				const activeShipments = await db.shipment.count({
					where: {
						deliveryPartnerId: partnerId,
						status: {
							notIn: ["DELIVERED", "CANCELLED"],
						},
					},
				});

				if (activeShipments > 0) {
					return c.json(
						{
							error: "Cannot delete delivery partner with active shipments",
							activeShipments,
						},
						400,
					);
				}

				// Delete shipping rates first
				await db.shippingRate.deleteMany({
					where: { deliveryPartnerId: partnerId },
				});

				// Delete delivery partner
				await db.deliveryPartner.delete({
					where: { id: partnerId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete delivery partner",
						details: error,
					},
					500,
				);
			}
		},
	)
	// POST create shipping rate
	.post(
		"/rates",
		authMiddleware,
		validator("json", createShippingRateSchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Create shipping rate",
			description: "Create a new shipping rate for a delivery partner",
			responses: {
				201: {
					description: "Shipping rate created successfully",
				},
				400: {
					description: "Invalid input data",
				},
				404: {
					description: "Delivery partner not found",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Check if delivery partner exists
				const partner = await db.deliveryPartner.findUnique({
					where: { id: data.deliveryPartnerId },
				});

				if (!partner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Create shipping rate
				const shippingRate = await db.shippingRate.create({
					data: {
						...data,
						createdById: userId,
					},
				});

				return c.json(shippingRate, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create shipping rate",
						details: error,
					},
					400,
				);
			}
		},
	)
	// GET shipping rates by delivery partner
	.get(
		"/:id/rates",
		authMiddleware,
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Get shipping rates",
			description: "Get shipping rates for a specific delivery partner",
			responses: {
				200: {
					description: "List of shipping rates",
				},
				404: {
					description: "Delivery partner not found",
				},
			},
		}),
		async (c) => {
			const partnerId = c.req.param("id");

			try {
				// Check if delivery partner exists
				const partner = await db.deliveryPartner.findUnique({
					where: { id: partnerId },
				});

				if (!partner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Get shipping rates
				const rates = await db.shippingRate.findMany({
					where: { deliveryPartnerId: partnerId },
					orderBy: [{ method: "asc" }, { name: "asc" }],
				});

				return c.json({
					items: rates,
					count: rates.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch shipping rates",
						details: error,
					},
					500,
				);
			}
		},
	)
	// PUT update shipping rate
	.put(
		"/rates/:id",
		authMiddleware,
		validator("json", updateShippingRateSchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Update shipping rate",
			description: "Update an existing shipping rate",
			responses: {
				200: {
					description: "Shipping rate updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Shipping rate not found",
				},
			},
		}),
		async (c) => {
			const rateId = c.req.param("id");
			const data = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Check if shipping rate exists
				const existingRate = await db.shippingRate.findUnique({
					where: { id: rateId },
				});

				if (!existingRate) {
					return c.json({ error: "Shipping rate not found" }, 404);
				}

				// Update shipping rate
				const updatedRate = await db.shippingRate.update({
					where: { id: rateId },
					data: {
						...data,
						updatedById: userId,
						updatedAt: new Date(),
					},
				});

				return c.json(updatedRate);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update shipping rate",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE shipping rate
	.delete(
		"/rates/:id",
		authMiddleware,
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Delete shipping rate",
			description: "Delete a shipping rate",
			responses: {
				200: {
					description: "Shipping rate deleted successfully",
				},
				404: {
					description: "Shipping rate not found",
				},
			},
		}),
		async (c) => {
			const rateId = c.req.param("id");

			try {
				// Check if shipping rate exists
				const rate = await db.shippingRate.findUnique({
					where: { id: rateId },
				});

				if (!rate) {
					return c.json({ error: "Shipping rate not found" }, 404);
				}

				// Delete shipping rate
				await db.shippingRate.delete({
					where: { id: rateId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete shipping rate",
						details: error,
					},
					500,
				);
			}
		},
	)
	// POST calculate shipping rates
	.post(
		"/calculate",
		authMiddleware,
		validator("json", calculateRateSchema),
		describeRoute({
			tags: ["Delivery Partners"],
			summary: "Calculate shipping rates",
			description: "Calculate shipping rates for a shipment",
			responses: {
				200: {
					description: "Calculated shipping rates",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			try {
				// Build query for finding applicable rates
				const whereClause: any = {
					organizationId: data.organizationId,
					isActive: true,
				};

				if (data.deliveryPartnerId) {
					whereClause.deliveryPartnerId = data.deliveryPartnerId;
				}

				if (data.method) {
					whereClause.method = data.method;
				}

				if (data.fromLocation) {
					whereClause.fromLocation = data.fromLocation;
				}

				if (data.toLocation) {
					whereClause.OR = [
						{ toLocation: data.toLocation },
						{ toLocation: null },
					];
				}

				// Filter by weight range
				if (data.weight) {
					whereClause.AND = [
						{
							OR: [
								{ minWeight: { lte: data.weight } },
								{ minWeight: null },
							],
						},
						{
							OR: [
								{ maxWeight: { gte: data.weight } },
								{ maxWeight: null },
							],
						},
					];
				}

				// Find applicable shipping rates
				const rates = await db.shippingRate.findMany({
					where: whereClause,
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
								status: true,
							},
						},
					},
				});

				// Calculate final rate for each shipping option
				const calculatedRates = rates.map((rate) => {
					// Base calculation
					let finalRate = rate.baseRate;

					// Add per kg rate if applicable
					if (rate.perKgRate && data.weight) {
						finalRate += rate.perKgRate * data.weight;
					}

					// Additional volumetric calculations could be added here
					// if (data.dimensions) { ... }

					return {
						rateId: rate.id,
						deliveryPartner: rate.deliveryPartner,
						method: rate.method,
						name: rate.name,
						estimatedDeliveryDays: rate.estimatedDeliveryDays,
						baseRate: rate.baseRate,
						perKgRate: rate.perKgRate,
						calculatedRate: finalRate,
						formattedRate: `$${finalRate.toFixed(2)}`,
					};
				});

				// Sort by rate (lowest first)
				calculatedRates.sort(
					(a, b) => a.calculatedRate - b.calculatedRate,
				);

				return c.json({
					items: calculatedRates,
					count: calculatedRates.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to calculate shipping rates",
						details: error,
					},
					400,
				);
			}
		},
	);