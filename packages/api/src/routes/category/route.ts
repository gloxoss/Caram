import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const categoryQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

const createCategorySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().nonempty("Name is required"),
});

const updateCategorySchema = z.object({
	name: z.string().nonempty("Name is required"),
});

export const categoryRouter = new Hono()
	.basePath("/category")
	// GET all categories
	.get(
		"/",
		authMiddleware,
		validator("query", categoryQuerySchema),
		describeRoute({
			tags: ["Category"],
			summary: "List categories",
			description: "Retrieve a list of categories",
			responses: {
				200: {
					description: "List of categories",
				},
			},
		}),
		async (c) => {
			const { organizationId } = c.req.valid("query");

			try {
				const categories = await db.category.findMany({
					where: { organizationId },
					orderBy: { name: "asc" },
					include: {
						_count: {
							select: {
								products: true,
							},
						},
					},
				});

				return c.json({
					items: categories,
					count: categories.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch categories",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new category
	.post(
		"/",
		authMiddleware,
		validator("json", createCategorySchema),
		describeRoute({
			tags: ["Category"],
			summary: "Create category",
			description: "Create a new category",
			responses: {
				201: {
					description: "Category created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			try {
				const category = await db.category.create({
					data,
					include: {
						_count: {
							select: {
								products: true,
							},
						},
					},
				});

				return c.json(category, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create category",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a category
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateCategorySchema),
		describeRoute({
			tags: ["Category"],
			summary: "Update category",
			description: "Update an existing category",
			responses: {
				200: {
					description: "Category updated successfully",
				},
				400: {
					description: "Invalid input data",
				},
				404: {
					description: "Category not found",
				},
			},
		}),
		async (c) => {
			const categoryId = c.req.param("id");
			const data = c.req.valid("json");

			try {
				const category = await db.category.update({
					where: { id: categoryId },
					data,
					include: {
						_count: {
							select: {
								products: true,
							},
						},
					},
				});

				return c.json(category);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update category",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a category
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Category"],
			summary: "Delete category",
			description: "Delete a category",
			responses: {
				200: {
					description: "Category deleted successfully",
				},
				404: {
					description: "Category not found",
				},
			},
		}),
		async (c) => {
			const categoryId = c.req.param("id");

			try {
				await db.category.delete({
					where: { id: categoryId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete category",
						details: error,
					},
					400,
				);
			}
		},
	);
