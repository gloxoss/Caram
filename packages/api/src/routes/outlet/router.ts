import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { memberRoleMiddleware } from "../../middleware";
import { authMiddleware } from "../../middleware/auth";

const outletsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
});

export const outletsRouter = new Hono().basePath("/outlets").get(
	"/",
	authMiddleware,
	memberRoleMiddleware({ resource: "outlets", action: "read" }), // Only users with "outlets:read" permission
	validator("query", outletsQuerySchema),
	describeRoute({
		tags: ["Outlets"],
		summary: "List all outlets for an organization",
		description:
			"Retrieve a list of outlets associated with the specified organization ID",
		parameters: [
			{
				name: "organizationId",
				in: "query",
				required: true,
				schema: { type: "string" },
			},
		],
		responses: {
			200: {
				description: "List of outlets",
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
								},
							},
						},
					},
				},
			},
			400: {
				description: "Invalid or missing organizationId",
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
		const { organizationId } = c.req.valid("query");
		const outlets = await db.outlet.findMany({
			where: { organizationId },
		});
		return c.json(outlets);
	},
);
