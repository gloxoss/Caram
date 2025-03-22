import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const brandQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const brandCreateSchema = z.object({
	name: z.string().min(1, "Name is required"),
	organizationId: z.string().nonempty("Organization ID is required"),
});

const brandUpdateSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const brandRouter = new Hono()
	.basePath("/brands")
	// GET all brands
	.get(
		"/",
		authMiddleware,
		validator("query", brandQuerySchema),
		describeRoute({
			tags: ["Brands"],
			summary: "List all brands for an organization",
			description:
				"Retrieve a list of brands associated with the specified organization ID",
			responses: {
				200: {
					description: "List of brands",
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
			const brands = await db.brand.findMany({
				where: { organizationId },
			});
			return c.json(brands);
		},
	)
	// GET a single brand by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Brands"],
			summary: "Get a single brand by ID",
			description: "Retrieve detailed information about a specific brand",
			responses: {
				200: {
					description: "Brand details",
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
					description: "Brand not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const brand = await db.brand.findUnique({
				where: { id },
			});

			if (!brand) {
				return c.json({ error: "Brand not found" }, 404);
			}

			return c.json(brand);
		},
	)
	// POST create a new brand
	.post(
		"/",
		authMiddleware,
		validator("json", brandCreateSchema),
		describeRoute({
			tags: ["Brands"],
			summary: "Create a new brand",
			description: "Create a new brand for the specified organization",
			responses: {
				201: {
					description: "Brand created successfully",
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

			const brand = await db.brand.create({
				data: {
					name,
					organizationId,
				},
			});

			return c.json(brand, 201);
		},
	)
	// PUT update a brand
	.put(
		"/:id",
		authMiddleware,
		validator("json", brandUpdateSchema),
		describeRoute({
			tags: ["Brands"],
			summary: "Update a brand",
			description: "Update details of an existing brand",
			responses: {
				200: {
					description: "Brand updated successfully",
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
					description: "Brand not found",
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
				const brand = await db.brand.update({
					where: { id },
					data: { name },
				});

				return c.json(brand);
			} catch (error) {
				return c.json({ error: "Brand not found" }, 404);
			}
		},
	)
	// DELETE a brand
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Brands"],
			summary: "Delete a brand",
			description: "Delete an existing brand",
			responses: {
				200: {
					description: "Brand deleted successfully",
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
					description: "Brand not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				await db.brand.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json({ error: "Brand not found" }, 404);
			}
		},
	);
