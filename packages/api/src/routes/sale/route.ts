import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
/* import { roleMiddleware } from "../../middleware/role"; */

const createSaleSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	outletId: z.string().nonempty("Outlet ID is required"),
	customerId: z.string().optional(),
	totalAmount: z.number().positive("Total amount must be positive"),
	items: z.array(
		z.object({
			productId: z.string().nonempty("Product ID is required"),
			quantity: z
				.number()
				.int()
				.positive("Quantity must be a positive integer"),
			unitPrice: z.number().positive("Unit price must be positive"),
		}),
	),
});

export const salesRouter = new Hono().basePath("/sales").post(
	"/",
	authMiddleware,
	/* roleMiddleware({ resource: "sales", action: "write" }),  */ // Only users with "sales:write" permission
	validator("json", createSaleSchema),
	describeRoute({
		tags: ["Sales"],
		summary: "Create a new sale",
		description: "Record a new sale at the POS for the specified outlet",
		requestBody: {
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							organizationId: { type: "string" },
							outletId: { type: "string" },
							customerId: { type: "string" },
							totalAmount: { type: "number" },
							items: {
								type: "array",
								items: {
									type: "object",
									properties: {
										productId: { type: "string" },
										quantity: { type: "number" },
										unitPrice: { type: "number" },
									},
								},
							},
						},
					},
				},
			},
		},
		responses: {
			201: {
				description: "Sale created successfully",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								id: { type: "string" },
								organizationId: { type: "string" },
								outletId: { type: "string" },
								totalAmount: { type: "number" },
							},
						},
					},
				},
			},
			400: {
				description: "Invalid input",
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
		const { organizationId, outletId, customerId, totalAmount, items } =
			c.req.valid("json");
		const user = c.get("user");

		const sale = await db.sale.create({
			data: {
				organizationId,
				outletId,
				userId: user.id,
				customerId,
				totalAmount,
				status: "completed",
				saleItems: {
					create: items.map((item) => ({
						productId: item.productId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						totalPrice: item.quantity * item.unitPrice,
					})),
				},
			},
		});

		return c.json(sale, 201);
	},
);
