import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const settingsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	key: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const settingIdParamSchema = z.object({
	id: z.string().nonempty("Setting ID is required"),
});

const createSettingSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	key: z.string().nonempty("Key is required"),
	value: z.any().refine((val) => {
		try {
			JSON.stringify(val);
			return true;
		} catch {
			return false;
		}
	}, "Value must be valid JSON"),
});

const updateSettingSchema = z.object({
	key: z.string().optional(),
	value: z
		.any()
		.refine((val) => {
			try {
				JSON.stringify(val);
				return true;
			} catch {
				return false;
			}
		}, "Value must be valid JSON")
		.optional(),
});

export const settingRouter = new Hono()
	.basePath("/settings")
	// GET all settings
	.get(
		"/",
		authMiddleware,
		validator("query", settingsQuerySchema),
		describeRoute({
			tags: ["Settings"],
			summary: "List all settings for an organization",
			description: "Retrieve a list of settings with optional filtering",
			responses: {
				200: {
					description: "List of settings",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									settings: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												organizationId: {
													type: "string",
												},
												key: { type: "string" },
												value: { type: "object" },
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
			const { organizationId, key, limit, offset } = c.req.valid("query");

			// Build where clause
			const where: any = { organizationId };

			// Add key filter if provided
			if (key) {
				where.key = { contains: key, mode: "insensitive" };
			}

			// Get settings with pagination
			const [settings, total] = await Promise.all([
				db.setting.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
				}),
				db.setting.count({ where }),
			]);

			return c.json({ settings, total });
		},
	)
	// GET a single setting by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", settingIdParamSchema),
		describeRoute({
			tags: ["Settings"],
			summary: "Get setting details",
			description:
				"Retrieve detailed information about a specific setting",
			responses: {
				200: {
					description: "Setting details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									key: { type: "string" },
									value: { type: "object" },
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
					description: "Setting not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const setting = await db.setting.findUnique({
				where: { id },
			});

			if (!setting) {
				return c.json({ error: "Setting not found" }, 404);
			}

			return c.json(setting);
		},
	)
	// CREATE a new setting
	.post(
		"/",
		authMiddleware,
		validator("json", createSettingSchema),
		describeRoute({
			tags: ["Settings"],
			summary: "Create a new setting",
			description: "Create a new setting associated with an organization",
			responses: {
				201: {
					description: "Setting created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									key: { type: "string" },
									value: { type: "object" },
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

			// Check if setting with same key exists
			const existingSetting = await db.setting.findFirst({
				where: {
					organizationId: data.organizationId,
					key: data.key,
				},
			});

			if (existingSetting) {
				return c.json(
					{
						error: `Setting with key '${data.key}' already exists`,
					},
					400,
				);
			}

			const setting = await db.setting.create({
				data: {
					organizationId: data.organizationId,
					key: data.key,
					value: data.value,
				},
			});

			return c.json(setting, 201);
		},
	)
	// UPDATE a setting
	.put(
		"/:id",
		authMiddleware,
		validator("param", settingIdParamSchema),
		validator("json", updateSettingSchema),
		describeRoute({
			tags: ["Settings"],
			summary: "Update a setting",
			description: "Update details of an existing setting",
			responses: {
				200: {
					description: "Setting updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									key: { type: "string" },
									value: { type: "object" },
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
					description: "Setting not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const setting = await db.setting.update({
					where: { id },
					data,
				});

				return c.json(setting);
			} catch (error) {
				return c.json({ error: "Setting not found" }, 404);
			}
		},
	)
	// DELETE a setting
	.delete(
		"/:id",
		authMiddleware,
		validator("param", settingIdParamSchema),
		describeRoute({
			tags: ["Settings"],
			summary: "Delete a setting",
			description: "Delete an existing setting",
			responses: {
				200: {
					description: "Setting deleted successfully",
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
					description: "Setting not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.setting.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Setting deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Setting not found" }, 404);
			}
		},
	);
