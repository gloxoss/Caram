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

export const productRouter = new Hono().basePath("/product").get(
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
);
