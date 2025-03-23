import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const shipmentStatusEnum = [
	"PENDING",
	"PROCESSING",
	"IN_TRANSIT",
	"OUT_FOR_DELIVERY",
	"DELIVERED",
	"FAILED",
	"RETURNED",
	"CANCELLED",
] as const;

const shippingMethodEnum = [
	"ROAD",
	"AIR",
	"SEA",
	"RAIL",
	"EXPRESS",
	"STANDARD",
	"ECONOMY",
] as const;

// Schema for listing shipments
const shipmentsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	deliveryPartnerId: z.string().optional(),
	status: z.enum(shipmentStatusEnum).optional(),
	search: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
});

// Schema for creating a shipment
const createShipmentSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	deliveryPartnerId: z.string().nonempty("Delivery partner ID is required"),
	trackingNumber: z.string().optional(),
	status: z.enum(shipmentStatusEnum).default("PENDING"),
	fromAddress: z.string().optional(),
	toAddress: z.string().nonempty("Destination address is required"),
	weight: z.number().nonnegative().optional(),
	dimensions: z
		.object({
			length: z.number().nonnegative().optional(),
			width: z.number().nonnegative().optional(),
			height: z.number().nonnegative().optional(),
		})
		.optional(),
	shippingMethod: z.enum(shippingMethodEnum).optional(),
	shippingCost: z.number().nonnegative().optional(),
	estimatedDelivery: z.string().optional(), // ISO date string
	notes: z.string().optional(),
});

// Schema for updating a shipment
const updateShipmentSchema = z.object({
	deliveryPartnerId: z.string().optional(),
	trackingNumber: z.string().optional(),
	status: z.enum(shipmentStatusEnum).optional(),
	fromAddress: z.string().optional(),
	toAddress: z.string().optional(),
	weight: z.number().nonnegative().optional(),
	dimensions: z
		.object({
			length: z.number().nonnegative().optional(),
			width: z.number().nonnegative().optional(),
			height: z.number().nonnegative().optional(),
		})
		.optional(),
	shippingMethod: z.enum(shippingMethodEnum).optional(),
	shippingCost: z.number().nonnegative().optional(),
	estimatedDelivery: z.string().optional(), // ISO date string
	actualDelivery: z.string().optional(), // ISO date string
	notes: z.string().optional(),
	trackingHistory: z.array(
		z.object({
			timestamp: z.string(), // ISO date string
			status: z.string(),
			location: z.string().optional(),
			description: z.string().optional(),
		})
	).optional(),
});

export const shipmentRouter = new Hono()
	.basePath("/shipments")
	// GET all shipments
	.get(
		"/",
		authMiddleware,
		validator("query", shipmentsQuerySchema),
		describeRoute({
			tags: ["Shipments"],
			summary: "List shipments",
			description: "Get shipments with optional filtering",
			responses: {
				200: {
					description: "List of shipments",
				},
			},
		}),
		async (c) => {
			const { 
				organizationId, 
				deliveryPartnerId, 
				status, 
				search,
				fromDate,
				toDate
			} = c.req.valid("query");

			try {
				const whereClause: any = { organizationId };

				if (deliveryPartnerId) {
					whereClause.deliveryPartnerId = deliveryPartnerId;
				}

				if (status) {
					whereClause.status = status;
				}

				if (fromDate && toDate) {
					whereClause.createdAt = {
						gte: new Date(fromDate),
						lte: new Date(toDate),
					};
				} else if (fromDate) {
					whereClause.createdAt = {
						gte: new Date(fromDate),
					};
				} else if (toDate) {
					whereClause.createdAt = {
						lte: new Date(toDate),
					};
				}

				if (search) {
					whereClause.OR = [
						{ trackingNumber: { contains: search, mode: "insensitive" } },
						{ fromAddress: { contains: search, mode: "insensitive" } },
						{ toAddress: { contains: search, mode: "insensitive" } },
						{ notes: { contains: search, mode: "insensitive" } },
					];
				}

				const shipments = await db.shipment.findMany({
					where: whereClause,
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
					orderBy: { createdAt: "desc" },
				});

				return c.json({
					items: shipments,
					count: shipments.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch shipments",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET shipment by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Shipments"],
			summary: "Get shipment",
			description: "Get detailed information about a specific shipment",
			responses: {
				200: {
					description: "Shipment details",
				},
				404: {
					description: "Shipment not found",
				},
			},
		}),
		async (c) => {
			const shipmentId = c.req.param("id");

			try {
				const shipment = await db.shipment.findUnique({
					where: { id: shipmentId },
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
								trackingUrlTemplate: true,
							},
						},
					},
				});

				if (!shipment) {
					return c.json({ error: "Shipment not found" }, 404);
				}

				// Generate tracking URL if template exists
				let trackingUrl = null;
				if (shipment.trackingNumber && shipment.deliveryPartner.trackingUrlTemplate) {
					trackingUrl = shipment.deliveryPartner.trackingUrlTemplate.replace(
						"{trackingNumber}",
						shipment.trackingNumber
					);
				}

				return c.json({
					...shipment,
					trackingUrl,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch shipment details",
						details: error,
					},
					500,
				);
			}
		},
	)
	// POST create shipment
	.post(
		"/",
		authMiddleware,
		validator("json", createShipmentSchema),
		describeRoute({
			tags: ["Shipments"],
			summary: "Create shipment",
			description: "Create a new shipment",
			responses: {
				201: {
					description: "Shipment created successfully",
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
				// Check if delivery partner exists
				const deliveryPartner = await db.deliveryPartner.findUnique({
					where: { id: data.deliveryPartnerId },
				});

				if (!deliveryPartner) {
					return c.json({ error: "Delivery partner not found" }, 404);
				}

				// Convert date strings to Date objects
				const shipmentData: any = { ...data };
				if (data.estimatedDelivery) {
					shipmentData.estimatedDelivery = new Date(data.estimatedDelivery);
				}

				// Initialize tracking history if not provided
				const trackingHistory = [
					{
						timestamp: new Date().toISOString(),
						status: data.status || "PENDING",
						description: "Shipment created",
					},
				];

				// Create shipment
				const shipment = await db.shipment.create({
					data: {
						...shipmentData,
						trackingHistory,
						createdById: userId,
					},
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json(shipment, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create shipment",
						details: error,
					},
					400,
				);
			}
		},
	)
	// PUT update shipment
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateShipmentSchema),
		describeRoute({
			tags: ["Shipments"],
			summary: "Update shipment",
			description: "Update an existing shipment",
			responses: {
				200: {
					description: "Shipment updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Shipment not found",
				},
			},
		}),
		async (c) => {
			const shipmentId = c.req.param("id");
			const data = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Check if shipment exists
				const existingShipment = await db.shipment.findUnique({
					where: { id: shipmentId },
				});

				if (!existingShipment) {
					return c.json({ error: "Shipment not found" }, 404);
				}

				// If delivery partner is being changed, verify it exists
				if (data.deliveryPartnerId) {
					const deliveryPartner = await db.deliveryPartner.findUnique({
						where: { id: data.deliveryPartnerId },
					});

					if (!deliveryPartner) {
						return c.json({ error: "Delivery partner not found" }, 404);
					}
				}

				// Convert date strings to Date objects
				const shipmentData: any = { ...data };
				if (data.estimatedDelivery) {
					shipmentData.estimatedDelivery = new Date(data.estimatedDelivery);
				}
				if (data.actualDelivery) {
					shipmentData.actualDelivery = new Date(data.actualDelivery);
				}

				// Update tracking history if status is changing
				if (data.status && data.status !== existingShipment.status) {
					const currentHistory = existingShipment.trackingHistory || [];
					const newHistoryEntry = {
						timestamp: new Date().toISOString(),
						status: data.status,
						description: `Status changed to ${data.status}`,
					};

					shipmentData.trackingHistory = Array.isArray(currentHistory) 
						? [...currentHistory, newHistoryEntry]
						: [newHistoryEntry];
				}

				// Update shipment
				const updatedShipment = await db.shipment.update({
					where: { id: shipmentId },
					data: {
						...shipmentData,
						updatedById: userId,
						updatedAt: new Date(),
					},
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json(updatedShipment);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update shipment",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE shipment
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Shipments"],
			summary: "Delete shipment",
			description: "Delete a shipment",
			responses: {
				200: {
					description: "Shipment deleted successfully",
				},
				404: {
					description: "Shipment not found",
				},
			},
		}),
		async (c) => {
			const shipmentId = c.req.param("id");

			try {
				// Check if shipment exists
				const shipment = await db.shipment.findUnique({
					where: { id: shipmentId },
				});

				if (!shipment) {
					return c.json({ error: "Shipment not found" }, 404);
				}

				// Only allow deletion of shipments that are not in transit or delivered
				if (["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(shipment.status)) {
					return c.json(
						{
							error: "Cannot delete shipments that are in transit or delivered",
							status: shipment.status,
						},
						400,
					);
				}

				// Delete shipment
				await db.shipment.delete({
					where: { id: shipmentId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete shipment",
						details: error,
					},
					500,
				);
			}
		},
	)
	// POST update shipment status
	.post(
		"/:id/status",
		authMiddleware,
		validator(
			"json",
			z.object({
				status: z.enum(shipmentStatusEnum),
				location: z.string().optional(),
				description: z.string().optional(),
			}),
		),
		describeRoute({
			tags: ["Shipments"],
			summary: "Update shipment status",
			description: "Update the status of a shipment and add to tracking history",
			responses: {
				200: {
					description: "Shipment status updated successfully",
				},
				404: {
					description: "Shipment not found",
				},
			},
		}),
		async (c) => {
			const shipmentId = c.req.param("id");
			const { status, location, description } = c.req.valid("json");
			const user = c.get("user");
			const userId = user.id;

			try {
				// Check if shipment exists
				const shipment = await db.shipment.findUnique({
					where: { id: shipmentId },
				});

				if (!shipment) {
					return c.json({ error: "Shipment not found" }, 404);
				}

				// Create new tracking history entry
				const currentHistory = shipment.trackingHistory || [];
				const newHistoryEntry = {
					timestamp: new Date().toISOString(),
					status,
					location,
					description: description || `Status changed to ${status}`,
				};

				// Update actual delivery date if status is DELIVERED
				const updateData: any = {
					status,
					trackingHistory: Array.isArray(currentHistory) 
						? [...currentHistory, newHistoryEntry]
						: [newHistoryEntry],
					updatedById: userId,
					updatedAt: new Date(),
				};

				if (status === "DELIVERED" && !shipment.actualDelivery) {
					updateData.actualDelivery = new Date();
				}

				// Update shipment
				const updatedShipment = await db.shipment.update({
					where: { id: shipmentId },
					data: updateData,
					include: {
						deliveryPartner: {
							select: {
								id: true,
								name: true,
								logo: true,
							},
						},
					},
				});

				return c.json(updatedShipment);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update shipment status",
						details: error,
					},
					500,
				);
			}
		},
	);