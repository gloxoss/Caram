import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const productQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	categoryId: z.string().optional(),
	brandId: z.string().optional(),
	unitId: z.string().optional(),
	rackId: z.string().optional(),
});

const productCreateSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	organizationId: z.string().nonempty("Organization ID is required"),
	categoryId: z.string().optional(),
	brandId: z.string().optional(),
	unitId: z.string().optional(),
	rackId: z.string().optional(),
	price: z.number().min(0, "Price must be a positive number"),
});

const productUpdateSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
	categoryId: z.string().optional().nullable(),
	brandId: z.string().optional().nullable(),
	unitId: z.string().optional().nullable(),
	rackId: z.string().optional().nullable(),
	price: z.number().min(0, "Price must be a positive number").optional(),
});

export const productRouter = new Hono()
	.basePath("/products")
	// GET all products with optional filtering
	.get(
		"/",
		authMiddleware,
		validator("query", productQuerySchema),
		describeRoute({
			tags: ["Products"],
			summary: "List all products for an organization",
			description:
				"Retrieve a list of products associated with the specified organization ID, with optional filtering by category, brand, unit, or rack",
			responses: {
				200: {
					description: "List of products",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										description: { type: "string" },
										organizationId: { type: "string" },
										categoryId: { type: "string" },
										brandId: { type: "string" },
										unitId: { type: "string" },
										rackId: { type: "string" },
										price: { type: "number" },
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
			const { organizationId, categoryId, brandId, unitId, rackId } =
				c.req.valid("query");

			const where = {
				organizationId,
				...(categoryId && { categoryId }),
				...(brandId && { brandId }),
				...(unitId && { unitId }),
				...(rackId && { rackId }),
			};

			const products = await db.product.findMany({
				where,
				include: {
					category: true,
					brand: true,
					unit: true,
					rack: true,
				},
			});

			return c.json(products);
		},
	)
	// GET a single product by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Products"],
			summary: "Get a single product by ID",
			description:
				"Retrieve detailed information about a specific product including its relationships",
			responses: {
				200: {
					description: "Product details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
									categoryId: { type: "string" },
									brandId: { type: "string" },
									unitId: { type: "string" },
									rackId: { type: "string" },
									price: { type: "number" },
									createdAt: {
										type: "string",
										format: "date-time",
									},
									updatedAt: {
										type: "string",
										format: "date-time",
									},
									category: {
										type: "object",
										nullable: true,
									},
									brand: {
										type: "object",
										nullable: true,
									},
									unit: {
										type: "object",
										nullable: true,
									},
									rack: {
										type: "object",
										nullable: true,
									},
								},
							},
						},
					},
				},
				404: {
					description: "Product not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const product = await db.product.findUnique({
				where: { id },
				include: {
					category: true,
					brand: true,
					unit: true,
					rack: true,
				},
			});

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			return c.json(product);
		},
	)
	// POST create a new product
	.post(
		"/",
		authMiddleware,
		validator("json", productCreateSchema),
		describeRoute({
			tags: ["Products"],
			summary: "Create a new product",
			description: "Create a new product for the specified organization",
			responses: {
				201: {
					description: "Product created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
									categoryId: { type: "string" },
									brandId: { type: "string" },
									unitId: { type: "string" },
									rackId: { type: "string" },
									price: { type: "number" },
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
			const productData = c.req.valid("json");

			const product = await db.product.create({
				data: productData,
				include: {
					category: true,
					brand: true,
					unit: true,
					rack: true,
				},
			});

			return c.json(product, 201);
		},
	)
	// PUT update a product
	.put(
		"/:id",
		authMiddleware,
		validator("json", productUpdateSchema),
		describeRoute({
			tags: ["Products"],
			summary: "Update a product",
			description: "Update details of an existing product",
			responses: {
				200: {
					description: "Product updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									description: { type: "string" },
									organizationId: { type: "string" },
									categoryId: { type: "string" },
									brandId: { type: "string" },
									unitId: { type: "string" },
									rackId: { type: "string" },
									price: { type: "number" },
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
					description: "Product not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");
			const updateData = c.req.valid("json");

			try {
				const product = await db.product.update({
					where: { id },
					data: updateData,
					include: {
						category: true,
						brand: true,
						unit: true,
						rack: true,
					},
				});

				return c.json(product);
			} catch (error) {
				return c.json({ error: "Product not found" }, 404);
			}
		},
	)
	// DELETE a product
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Products"],
			summary: "Delete a product",
			description: "Delete an existing product",
			responses: {
				200: {
					description: "Product deleted successfully",
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
					description: "Product not found",
				},
				401: {
					description: "Unauthorized",
				},
			},
		}),
		async (c) => {
			const id = c.req.param("id");

			try {
				await db.product.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json({ error: "Product not found" }, 404);
			}
		},
	);
