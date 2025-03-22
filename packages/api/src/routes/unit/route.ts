import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const unitQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const unitCreateSchema = z.object({
	name: z.string().min(1, "Name is required"),
	organizationId: z.string().nonempty("Organization ID is required"),
});

const unitUpdateSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const unitRouter = new Hono()
	.basePath("/units")
	// GET all units
	.get(
		"/",
		authMiddleware,
		validator("query", unitQuerySchema),
		describeRoute({
			tags: ["Units"],
			summary: "List all units for an organization",
			description:
				"Retrieve a list of measurement units associated with the specified organization ID",
			responses: {
				200: {
					description: "List of units",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
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
				},
				400: {
					description: "Invalid or missing organizationId",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { organizationId } = c.req.valid("query");
			const units = await db.unit.findMany({
				where: { organizationId },
			});
			return c.json(units);
		},
	)
	// GET a single unit by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Units"],
			summary: "Get a single unit by ID",
			description:
				"Retrieve detailed information about a specific measurement unit",
			responses: {
				200: {
					description: "Unit details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
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
					description: "Unit not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const unit = await db.unit.findUnique({
				where: { id },
			});

			if (!unit) {
				return c.json({ error: "Unit not found" }, 404);
			}

			return c.json(unit);
		},
	)
	// POST create a new unit
	.post(
		"/",
		authMiddleware,
		validator("json", unitCreateSchema),
		describeRoute({
			tags: ["Units"],
			summary: "Create a new unit",
			description:
				"Create a new measurement unit for the specified organization",
			responses: {
				201: {
					description: "Unit created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
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
					description: "Invalid input data",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const { name, organizationId } = c.req.valid("json");

			const unit = await db.unit.create({
				data: {
					name,
					organizationId,
				},
			});

			return c.json(unit, 201);
		},
	)
	// PUT update a unit
	.put(
		"/:id",
		authMiddleware,
		validator("json", unitUpdateSchema),
		describeRoute({
			tags: ["Units"],
			summary: "Update a unit",
			description: "Update details of an existing measurement unit",
			responses: {
				200: {
					description: "Unit updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
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
					description: "Invalid input data",
				},
				404: {
					description: "Unit not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const { name } = c.req.valid("json");

			try {
				const unit = await db.unit.update({
					where: { id },
					data: { name },
				});

				return c.json(unit);
			} catch (error) {
				return c.json({ error: "Unit not found" }, 404);
			}
		},
	)
	// DELETE a unit
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Units"],
			summary: "Delete a unit",
			description: "Delete an existing measurement unit",
			responses: {
				200: {
					description: "Unit deleted successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
								},
							},
						},
					},
				},
				404: {
					description: "Unit not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				await db.unit.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json({ error: "Unit not found" }, 404);
			}
		},
	);
