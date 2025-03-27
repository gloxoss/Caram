import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

const productQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	categoryId: z.string().optional(),
});

const productIdParamSchema = z.object({
	id: z.string().nonempty("Product ID is required"),
});

const createProductSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	categoryId: z.string().optional(),
	brandId: z.string().optional(),
	unitId: z.string().optional(),
	rackId: z.string().optional(),
	price: z.number().min(0, "Price must be a positive number"),
});

const updateProductSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
	categoryId: z.string().optional(),
	brandId: z.string().optional(),
	unitId: z.string().optional(),
	rackId: z.string().optional(),
	price: z.number().min(0, "Price must be a positive number").optional(),
});

const bulkCreateProductSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	products: z
		.array(
			z.object({
				name: z.string().min(1, "Name is required"),
				description: z.string().optional(),
				categoryId: z.string().optional(),
				brandId: z.string().optional(),
				unitId: z.string().optional(),
				rackId: z.string().optional(),
				price: z.number().min(0, "Price must be a positive number"),
			}),
		)
		.min(1, "At least one product is required"),
});

export const productRouter = new Hono()
	.basePath("/product")
	// BULK create products
	.post(
		"/bulk",
		authMiddleware,
		validator("json", bulkCreateProductSchema),
		describeRoute({
			tags: ["Product"],
			summary: "Bulk create products",
			description: "Create multiple products in a single request",
			responses: {
				201: {
					description: "Products created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const { organizationId, products } = c.req.valid("json");

			try {
				// Use a transaction to ensure all products are created or none
				const createdProducts = await db.$transaction(
					products.map((product) =>
						db.product.create({
							data: {
								organizationId,
								name: product.name,
								description: product.description,
								categoryId: product.categoryId,
								brandId: product.brandId,
								unitId: product.unitId,
								rackId: product.rackId,
								price: product.price,
							},
						}),
					),
				);

				return c.json(
					{
						success: true,
						count: createdProducts.length,
						items: createdProducts,
					},
					201,
				);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create products",
						details: error,
					},
					400,
				);
			}
		},
	)
	// GET all products
	.get(
		"/",
		authMiddleware,
		validator("query", productQuerySchema),
		describeRoute({
			tags: ["Product"],
			summary: "List products",
			description: "Retrieve a list of products with optional filtering",
			responses: {
				200: {
					description: "List of products",
				},
			},
		}),
		async (c) => {
			const { organizationId, search, categoryId } = c.req.valid("query");

			try {
				const where: any = {
					organizationId,
					...(categoryId && { categoryId }),
					...(search && {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{
								description: {
									contains: search,
									mode: "insensitive",
								},
							},
						],
					}),
				};

				const products = await db.product.findMany({
					where,
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
						brand: {
							select: {
								id: true,
								name: true,
							},
						},
						unit: {
							select: {
								id: true,
								name: true,
							},
						},
						inventoryItems: {
							select: {
								quantity: true,
							},
						},
					},
					orderBy: { name: "asc" },
				});

				// Calculate total stock across all outlets
				const productsWithStock = products.map((product) => ({
					...product,
					totalStock: product.inventoryItems.reduce(
						(sum, item) => sum + item.quantity,
						0,
					),
				}));

				return c.json({
					items: productsWithStock,
					count: productsWithStock.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch products",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a single product by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", productIdParamSchema),
		describeRoute({
			tags: ["Product"],
			summary: "Get product details",
			description:
				"Retrieve detailed information about a specific product",
			responses: {
				200: {
					description: "Product details",
				},
				404: {
					description: "Product not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				const product = await db.product.findUnique({
					where: { id },
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
						brand: {
							select: {
								id: true,
								name: true,
							},
						},
						unit: {
							select: {
								id: true,
								name: true,
							},
						},
						rack: {
							select: {
								id: true,
								name: true,
							},
						},
						inventoryItems: {
							select: {
								quantity: true,
								outletId: true,
								outlet: {
									select: {
										name: true,
									},
								},
							},
						},
					},
				});

				if (!product) {
					return c.json({ error: "Product not found" }, 404);
				}

				// Calculate total stock across all outlets
				const totalStock = product.inventoryItems.reduce(
					(sum, item) => sum + item.quantity,
					0,
				);

				return c.json({
					...product,
					totalStock,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch product",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new product
	.post(
		"/",
		authMiddleware,
		validator("json", createProductSchema),
		describeRoute({
			tags: ["Product"],
			summary: "Create product",
			description: "Create a new product",
			responses: {
				201: {
					description: "Product created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			try {
				const product = await db.product.create({
					data,
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
						brand: {
							select: {
								id: true,
								name: true,
							},
						},
						unit: {
							select: {
								id: true,
								name: true,
							},
						},
						rack: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json(product, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create product",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a product
	.put(
		"/:id",
		authMiddleware,
		validator("param", productIdParamSchema),
		validator("json", updateProductSchema),
		describeRoute({
			tags: ["Product"],
			summary: "Update product",
			description: "Update an existing product",
			responses: {
				200: {
					description: "Product updated successfully",
				},
				400: {
					description: "Invalid input data",
				},
				404: {
					description: "Product not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const product = await db.product.update({
					where: { id },
					data,
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
						brand: {
							select: {
								id: true,
								name: true,
							},
						},
						unit: {
							select: {
								id: true,
								name: true,
							},
						},
						rack: {
							select: {
								id: true,
								name: true,
							},
						},
						inventoryItems: {
							select: {
								quantity: true,
							},
						},
					},
				});

				// Calculate total stock across all outlets
				const totalStock = product.inventoryItems.reduce(
					(sum, item) => sum + item.quantity,
					0,
				);

				return c.json({
					...product,
					totalStock,
				});
			} catch (error) {
				if ((error as { code?: string }).code === "P2025") {
					return c.json({ error: "Product not found" }, 404);
				}
				return c.json(
					{
						error: "Failed to update product",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a product
	.delete(
		"/:id",
		authMiddleware,
		validator("param", productIdParamSchema),
		describeRoute({
			tags: ["Product"],
			summary: "Delete product",
			description: "Delete a product",
			responses: {
				200: {
					description: "Product deleted successfully",
				},
				404: {
					description: "Product not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.product.delete({
					where: { id },
				});

				return c.json({ success: true });
			} catch (error) {
				if ((error as { code?: string }).code === "P2025") {
					return c.json({ error: "Product not found" }, 404);
				}
				return c.json(
					{
						error: "Failed to delete product",
						details: error,
					},
					400,
				);
			}
		},
	);
