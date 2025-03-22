import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const categoryQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const categoryCreateSchema = z.object({
	name: z.string().min(1, "Name is required"),
	organizationId: z.string().nonempty("Organization ID is required"),
});

const categoryUpdateSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const categoryRouter = new Hono()
	.basePath("/categories")
	// GET all categories
	.get(
		"/",
		authMiddleware,
		validator("query", categoryQuerySchema),
		describeRoute({
			tags: ["Categories"],
			summary: "List all categories for an organization",
			description:
				"Retrieve a list of categories associated with the specified organization ID",
			responses: {
				200: {
					description: "List of categories",
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
			const categories = await db.category.findMany({
				where: { organizationId },
			});
			return c.json(categories);
		},
	)
	// GET a single category by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Categories"],
			summary: "Get a single category by ID",
			description:
				"Retrieve detailed information about a specific category",
			responses: {
				200: {
					description: "Category details",
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
					description: "Category not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const category = await db.category.findUnique({
				where: { id },
			});

			if (!category) {
				return c.json({ error: "Category not found" }, 404);
			}

			return c.json(category);
		},
	)
	// POST create a new category
	.post(
		"/",
		authMiddleware,
		validator("json", categoryCreateSchema),
		describeRoute({
			tags: ["Categories"],
			summary: "Create a new category",
			description: "Create a new category for the specified organization",

			responses: {
				201: {
					description: "Category created successfully",
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

			const category = await db.category.create({
				data: {
					name,
					organizationId,
				},
			});

			return c.json(category, 201);
		},
	)
	// PUT update a category
	.put(
		"/:id",
		authMiddleware,
		validator("json", categoryUpdateSchema),
		describeRoute({
			tags: ["Categories"],
			summary: "Update a category",
			description: "Update details of an existing category",

			responses: {
				200: {
					description: "Category updated successfully",
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
					description: "Category not found",
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
				const category = await db.category.update({
					where: { id },
					data: { name },
				});

				return c.json(category);
			} catch (error) {
				return c.json({ error: "Category not found" }, 404);
			}
		},
	)
	// DELETE a category
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Categories"],
			summary: "Delete a category",
			description: "Delete an existing category",
			responses: {
				200: {
					description: "Category deleted successfully",
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
					description: "Category not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				await db.category.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json({ error: "Category not found" }, 404);
			}
		},
	);
