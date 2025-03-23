import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const attributesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const attributeIdParamSchema = z.object({
	id: z.string().nonempty("Attribute ID is required"),
});

const createAttributeSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
});

const updateAttributeSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

const createVariationSchema = z.object({
	productId: z.string().nonempty("Product ID is required"),
	attributeId: z.string().nonempty("Attribute ID is required"),
	value: z.string().min(1, "Value is required"),
});

const updateVariationSchema = z.object({
	value: z.string().min(1, "Value is required"),
});

// === Router Definition ===
export const attributeRouter = new Hono()
	.basePath("/attributes")
	// GET all attributes
	.get(
		"/",
		authMiddleware,
		validator("query", attributesQuerySchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "List all attributes for an organization",
			description:
				"Retrieve a list of product attributes with optional filtering by search term",
			responses: {
				200: {
					description: "List of attributes",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									attributes: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												organizationId: {
													type: "string",
												},
												createdAt: {
													type: "string",
													format: "date-time",
												},
												updatedAt: {
													type: "string",
													format: "date-time",
												},
												variationCount: {
													type: "number",
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
					description: "Invalid or missing parameters",
				},
			},
		}),
		async (c) => {
			const { organizationId, search, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: Prisma.AttributeWhereInput = { organizationId };

			// Add search if provided
			if (search) {
				where.name = { contains: search, mode: "insensitive" };
			}

			// Get attributes with pagination
			const [attributes, total] = await Promise.all([
				db.attribute.findMany({
					where,
					orderBy: { name: "asc" },
					take: limit,
					skip: offset,
					include: {
						_count: {
							select: { variations: true },
						},
					},
				}),
				db.attribute.count({ where }),
			]);

			// Format response with variation count
			const formattedAttributes = attributes.map((attr) => ({
				...attr,
				variationCount: attr._count.variations,
				_count: undefined,
			}));

			return c.json({ attributes: formattedAttributes, total });
		},
	)
	// GET a single attribute by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", attributeIdParamSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Get attribute details",
			description:
				"Retrieve detailed information about a specific attribute",
			responses: {
				200: {
					description: "Attribute details",
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
									variations: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												value: { type: "string" },
												productId: { type: "string" },
												product: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
													},
												},
											},
										},
									},
									usedInProductCount: { type: "number" },
								},
							},
						},
					},
				},
				404: {
					description: "Attribute not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const attribute = await db.attribute.findUnique({
				where: { id },
				include: {
					variations: {
						include: {
							product: {
								select: { name: true },
							},
						},
						orderBy: { value: "asc" },
					},
				},
			});

			if (!attribute) {
				return c.json({ error: "Attribute not found" }, 404);
			}

			// Count distinct products using this attribute
			const distinctProductsCount = new Set(
				attribute.variations.map((v) => v.productId),
			).size;

			return c.json({
				...attribute,
				usedInProductCount: distinctProductsCount,
			});
		},
	)
	// CREATE a new attribute
	.post(
		"/",
		authMiddleware,
		validator("json", createAttributeSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Create a new attribute",
			description: "Create a new product attribute",
			responses: {
				201: {
					description: "Attribute created successfully",
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
					description: "Invalid input",
				},
				409: {
					description: "Attribute with the same name already exists",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Check if attribute with the same name already exists
			const existingAttribute = await db.attribute.findFirst({
				where: {
					organizationId: data.organizationId,
					name: {
						equals: data.name,
						mode: "insensitive",
					},
				},
			});

			if (existingAttribute) {
				return c.json(
					{
						error: "Attribute with this name already exists",
					},
					409,
				);
			}

			// Create the attribute
			const attribute = await db.attribute.create({
				data,
			});

			return c.json(attribute, 201);
		},
	)
	// UPDATE an attribute
	.put(
		"/:id",
		authMiddleware,
		validator("param", attributeIdParamSchema),
		validator("json", updateAttributeSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Update an attribute",
			description: "Update details of an existing attribute",
			responses: {
				200: {
					description: "Attribute updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
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
					description: "Attribute not found",
				},
				409: {
					description: "Attribute with the same name already exists",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Get the current attribute to check organization
			const currentAttribute = await db.attribute.findUnique({
				where: { id },
			});

			if (!currentAttribute) {
				return c.json({ error: "Attribute not found" }, 404);
			}

			// Check if attribute with the same name already exists in the organization
			const existingAttribute = await db.attribute.findFirst({
				where: {
					organizationId: currentAttribute.organizationId,
					name: {
						equals: data.name,
						mode: "insensitive",
					},
					id: { not: id }, // Exclude the current attribute from the check
				},
			});

			if (existingAttribute) {
				return c.json(
					{
						error: "Attribute with this name already exists",
					},
					409,
				);
			}

			try {
				const attribute = await db.attribute.update({
					where: { id },
					data,
				});

				return c.json(attribute);
			} catch (error) {
				return c.json({ error: "Attribute not found" }, 404);
			}
		},
	)
	// DELETE an attribute
	.delete(
		"/:id",
		authMiddleware,
		validator("param", attributeIdParamSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Delete an attribute",
			description:
				"Delete an existing attribute (will fail if attribute has associated variations)",
			responses: {
				200: {
					description: "Attribute deleted successfully",
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
				400: {
					description:
						"Cannot delete attribute with associated variations",
				},
				404: {
					description: "Attribute not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Check if attribute has associated variations
				const variationCount = await db.variation.count({
					where: { attributeId: id },
				});

				if (variationCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete attribute with associated variations",
						},
						400,
					);
				}

				await db.attribute.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Attribute deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Attribute not found" }, 404);
			}
		},
	)
	// GET all variations for an attribute
	.get(
		"/:id/variations",
		authMiddleware,
		validator("param", attributeIdParamSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "List attribute variations",
			description:
				"Retrieve all variations associated with a specific attribute",
			responses: {
				200: {
					description: "List of variations",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									variations: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												value: { type: "string" },
												productId: { type: "string" },
												product: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
													},
												},
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
				404: {
					description: "Attribute not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "50");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify attribute exists
			const attribute = await db.attribute.findUnique({
				where: { id },
			});

			if (!attribute) {
				return c.json({ error: "Attribute not found" }, 404);
			}

			// Get variations with pagination
			const [variations, total] = await Promise.all([
				db.variation.findMany({
					where: { attributeId: id },
					orderBy: { value: "asc" },
					skip: offset,
					take: limit,
					include: {
						product: {
							select: { name: true },
						},
					},
				}),
				db.variation.count({ where: { attributeId: id } }),
			]);

			return c.json({
				variations,
				total,
			});
		},
	)
	// CREATE a variation for a product attribute
	.post(
		"/variations",
		authMiddleware,
		validator("json", createVariationSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Create a new variation",
			description: "Create a new variation for a product",
			responses: {
				201: {
					description: "Variation created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									productId: { type: "string" },
									attributeId: { type: "string" },
									value: { type: "string" },
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
				404: {
					description: "Product or attribute not found",
				},
				409: {
					description:
						"Variation for this attribute already exists for this product",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify product and attribute exist
			const [product, attribute] = await Promise.all([
				db.product.findUnique({ where: { id: data.productId } }),
				db.attribute.findUnique({ where: { id: data.attributeId } }),
			]);

			if (!product) {
				return c.json({ error: "Product not found" }, 404);
			}

			if (!attribute) {
				return c.json({ error: "Attribute not found" }, 404);
			}

			// Check if variation for this attribute already exists for this product
			const existingVariation = await db.variation.findFirst({
				where: {
					productId: data.productId,
					attributeId: data.attributeId,
				},
			});

			if (existingVariation) {
				return c.json(
					{
						error: "A variation for this attribute already exists for this product",
					},
					409,
				);
			}

			// Create the variation
			const variation = await db.variation.create({
				data,
			});

			return c.json(variation, 201);
		},
	)
	// UPDATE a variation
	.put(
		"/variations/:id",
		authMiddleware,
		validator("param", attributeIdParamSchema), // Reusing param schema as it just needs an ID
		validator("json", updateVariationSchema),
		describeRoute({
			tags: ["Attributes"],
			summary: "Update a variation",
			description: "Update the value of an existing variation",
			responses: {
				200: {
					description: "Variation updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									productId: { type: "string" },
									attributeId: { type: "string" },
									value: { type: "string" },
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
					description: "Variation not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			try {
				const variation = await db.variation.update({
					where: { id },
					data,
				});

				return c.json(variation);
			} catch (error) {
				return c.json({ error: "Variation not found" }, 404);
			}
		},
	)
	// DELETE a variation
	.delete(
		"/variations/:id",
		authMiddleware,
		validator("param", attributeIdParamSchema), // Reusing param schema as it just needs an ID
		describeRoute({
			tags: ["Attributes"],
			summary: "Delete a variation",
			description: "Delete an existing variation from a product",
			responses: {
				200: {
					description: "Variation deleted successfully",
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
					description: "Variation not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				await db.variation.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Variation deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Variation not found" }, 404);
			}
		},
	);
