import { authClient } from "@repo/auth/client";
import { db } from "@repo/database";
import slugify from "@sindresorhus/slugify";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { adminMiddleware } from "../../middleware/admin";
import { authMiddleware } from "../../middleware/auth";
export const organizationsRouter = new Hono().basePath("/organizations");

// Schema for creating an organization
const createOrganizationSchema = z.object({
	name: z.string().min(1, "Name is required"),
	slug: z.string().optional(),
	logo: z.string().optional(),
	metadata: z.string().optional(),
	paymentsCustomerId: z.string().optional(),
});

// Schema for updating an organization
const updateOrganizationSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	slug: z.string().optional(),
	logo: z.string().optional(),
	metadata: z.string().optional(),
	paymentsCustomerId: z.string().optional(),
});

// GET /organizations - List all organizations (admin-only)
organizationsRouter.get(
	"/",
	adminMiddleware,
	validator(
		"query",
		z.object({
			query: z.string().optional(),
			limit: z.string().optional().default("10").transform(Number),
			offset: z.string().optional().default("0").transform(Number),
		}),
	),
	describeRoute({
		tags: ["Organizations"],
		summary: "Get all organizations",
		description:
			"List all organizations with pagination and search (admin-only)",
		responses: {
			200: {
				description: "List of organizations",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								organizations: z.array(
									z.object({
										id: z.string(),
										name: z.string(),
										slug: z.string().optional(),
										logo: z.string().optional(),
										metadata: z.string().optional(),
										paymentsCustomerId: z
											.string()
											.optional(),
										createdAt: z.string(),
										updatedAt: z.string(),
									}),
								),
								total: z.number(),
							}),
						),
					},
				},
			},
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const { query, limit, offset } = c.req.valid("query");

		const organizations = await db.organization.findMany({
			where: {
				name: { contains: query, mode: "insensitive" },
			},
			include: {
				_count: {
					select: { members: true },
				},
			},
			take: limit,
			skip: offset,
		});

		const total = await db.organization.count();

		return c.json({ organizations, total });
	},
);

// POST /organizations - Create a new organization using better-auth
organizationsRouter.post(
	"/",
	adminMiddleware, // Use authMiddleware instead of adminMiddleware to allow authenticated users
	validator("json", createOrganizationSchema),
	describeRoute({
		tags: ["Organizations"],
		summary: "Create a new organization",

		responses: {
			201: {
				description: "Organization created",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								name: z.string(),
								slug: z.string().optional(),
								logo: z.string().optional(),
								metadata: z.string().optional(),
								paymentsCustomerId: z.string().optional(),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
			},
			400: { description: "Invalid input" },
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const data = c.req.valid("json");
		const user = c.get("user"); // Get the authenticated user

		// Generate a unique slug
		let slug = data.slug || slugify(data.name, { lowercase: true });
		let hasAvailableSlug = false;
		for (let i = 0; i < 3; i++) {
			const existing = await db.organization.findUnique({
				where: { slug },
			});
			if (!existing) {
				hasAvailableSlug = true;
				break;
			}
			slug = `${slug}-${nanoid(5)}`;
		}
		if (!hasAvailableSlug) {
			return c.json({ error: "No available slug found" }, 400);
		}

		// Use better-auth to create the organization
		const { data: organization, error } =
			await authClient.organization.create({
				name: data.name,
				slug,
				metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
				fetchOptions: {
					headers: {
						cookie: c.req.header("cookie") || "", // Pass cookies for session
					},
				},
			});

		if (error) {
			return c.json(
				{ error: error.message || "Failed to create organization" },
				400,
			);
		}

		// Update additional fields not handled by better-auth (if needed)
		const updatedOrganization = await db.organization.update({
			where: { id: organization.id },
			data: {
				logo: data.logo,
				paymentsCustomerId: data.paymentsCustomerId,
			},
		});

		return c.json(updatedOrganization, 201);
	},
);

// GET /organizations/:id - Get a specific organization (admin or member)
organizationsRouter.get(
	"/:id",
	authMiddleware,
	describeRoute({
		tags: ["Organizations"],
		summary: "Get an organization by ID",
		responses: {
			200: {
				description: "Organization details",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								name: z.string(),
								slug: z.string().optional(),
								logo: z.string().optional(),
								metadata: z.string().optional(),
								paymentsCustomerId: z.string().optional(),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
			},
			404: { description: "Organization not found" },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");
		const user = c.get("user");

		const organization = await db.organization.findUnique({
			where: { id },
			include: { members: true, invitations: true },
		});

		if (!organization) {
			return c.json({ error: "Organization not found" }, 404);
		}

		const isAdmin = user.role === "ADMIN";
		const isMember = organization.members.some(
			(member) => member.userId === user.id,
		);
		if (!isAdmin && !isMember) {
			return c.json({ error: "Forbidden" }, 403);
		}

		return c.json(organization);
	},
);

// PUT /organizations/:id - Update an organization (admin-only)
organizationsRouter.put(
	"/:id",
	adminMiddleware,
	validator("json", updateOrganizationSchema),
	describeRoute({
		tags: ["Organizations"],
		summary: "Update an organization",

		responses: {
			200: {
				description: "Organization updated",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								name: z.string(),
								slug: z.string().optional(),
								logo: z.string().optional(),
								metadata: z.string().optional(),
								paymentsCustomerId: z.string().optional(),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
			},
			404: { description: "Organization not found" },
			400: { description: "Invalid input" },
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");

		const organization = await db.organization.findUnique({
			where: { id },
		});
		if (!organization) {
			return c.json({ error: "Organization not found" }, 404);
		}

		if (data.slug && data.slug !== organization.slug) {
			const existing = await db.organization.findUnique({
				where: { slug: data.slug },
			});
			if (existing) {
				return c.json({ error: "Slug already exists" }, 400);
			}
		}

		const updatedOrganization = await db.organization.update({
			where: { id },
			data,
		});

		return c.json(updatedOrganization);
	},
);

// DELETE /organizations/:id - Delete an organization (admin-only)
organizationsRouter.delete(
	"/:id",
	adminMiddleware,
	describeRoute({
		tags: ["Organizations"],
		summary: "Delete an organization",
		responses: {
			204: { description: "Organization deleted" },
			404: { description: "Organization not found" },
			401: { description: "Unauthorized" },
			400: { description: "Cannot delete organization with members" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");

		const organization = await db.organization.findUnique({
			where: { id },
			include: { members: true },
		});
		if (!organization) {
			return c.json({ error: "Organization not found" }, 404);
		}

		if (organization.members.length > 0) {
			return c.json(
				{ error: "Cannot delete organization with members" },
				400,
			);
		}

		await db.organization.delete({ where: { id } });

		return c.body(null, 204);
	},
);
