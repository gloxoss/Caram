import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const rackQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const rackCreateSchema = z.object({
	name: z.string().min(1, "Name is required"),
	organizationId: z.string().nonempty("Organization ID is required"),
});

const rackUpdateSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const rackRouter = new Hono()
	.basePath("/racks")
	// GET all racks
	.get(
		"/",
		authMiddleware,
		validator("query", rackQuerySchema),
		describeRoute({
			tags: ["Racks"],
			summary: "List all racks for an organization",
			description:
				"Retrieve a list of storage racks associated with the specified organization ID",
			responses: {
				200: {
					description: "List of racks",
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
			const racks = await db.rack.findMany({
				where: { organizationId },
			});
			return c.json(racks);
		},
	)
	// GET a single rack by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Racks"],
			summary: "Get a single rack by ID",
			description:
				"Retrieve detailed information about a specific storage rack",
			responses: {
				200: {
					description: "Rack details",
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
					description: "Rack not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const rack = await db.rack.findUnique({
				where: { id },
			});

			if (!rack) {
				return c.json({ error: "Rack not found" }, 404);
			}

			return c.json(rack);
		},
	)
	// POST create a new rack
	.post(
		"/",
		authMiddleware,
		validator("json", rackCreateSchema),
		describeRoute({
			tags: ["Racks"],
			summary: "Create a new rack",
			description:
				"Create a new storage rack for the specified organization",
			responses: {
				201: {
					description: "Rack created successfully",
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

			const rack = await db.rack.create({
				data: {
					name,
					organizationId,
				},
			});

			return c.json(rack, 201);
		},
	)
	// PUT update a rack
	.put(
		"/:id",
		authMiddleware,
		validator("json", rackUpdateSchema),
		describeRoute({
			tags: ["Racks"],
			summary: "Update a rack",
			description: "Update details of an existing storage rack",
			responses: {
				200: {
					description: "Rack updated successfully",
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
					description: "Rack not found",
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
				const rack = await db.rack.update({
					where: { id },
					data: { name },
				});

				return c.json(rack);
			} catch (error) {
				return c.json({ error: "Rack not found" }, 404);
			}
		},
	)
	// DELETE a rack
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Racks"],
			summary: "Delete a rack",
			description: "Delete an existing storage rack",
			responses: {
				200: {
					description: "Rack deleted successfully",
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
					description: "Rack not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				await db.rack.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json({ error: "Rack not found" }, 404);
			}
		},
	);
