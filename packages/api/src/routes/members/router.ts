import {} from "@repo/auth";
import {} from "@repo/auth";
import { db } from "@repo/database"; // Adjust to your Prisma client import path
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";
import { z } from "zod";
import { adminMiddleware } from "../../middleware/admin";
import { authMiddleware } from "../../middleware/auth";

export const membersRouter = new Hono().basePath("/members");

// Schema for creating a member
const createMemberSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
	organizationId: z.string().min(1, "Organization ID is required"),
	role: z.enum(["MEMBER", "admin"]).default("MEMBER"),
});

// Schema for updating a member
const updateMemberSchema = z.object({
	role: z.enum(["MEMBER", "admin"]).optional(),
});

// GET /members - List all members of an organization
membersRouter.get(
	"/",
	authMiddleware,
	validator(
		"query",
		z.object({
			organizationId: z.string().min(1, "Organization ID is required"),
			limit: z.string().optional().default("10").transform(Number),
			offset: z.string().optional().default("0").transform(Number),
		}),
	),
	describeRoute({
		tags: ["Members"],
		summary: "Get all members of an organization",
		description:
			"List members with pagination (admins or organization members)",
		responses: {
			200: {
				description: "List of members",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								members: z.array(
									z.object({
										id: z.string(),
										userId: z.string(),
										organizationId: z.string(),
										role: z.enum(["MEMBER", "admin"]),
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
			403: { description: "Forbidden" },
		},
	}),
	async (c) => {
		const { organizationId, limit, offset } = c.req.valid("query");
		const user = c.get("user"); // Authenticated user

		// Check if the user is a member of the organization
		const membership = await db.member.findFirst({
			where: { userId: user.id, organizationId },
		});
		if (!membership && user.role !== "admin") {
			throw new HTTPException(403, { message: "Forbidden" });
		}

		const members = await db.member.findMany({
			where: { organizationId },
			take: limit,
			skip: offset,
		});

		const total = await db.member.count({ where: { organizationId } });

		return c.json({ members, total });
	},
);

// GET /members/:id - Get a specific member
membersRouter.get(
	"/:id",
	authMiddleware,
	describeRoute({
		tags: ["Members"],
		summary: "Get a member by ID",
		responses: {
			200: {
				description: "Member details",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								userId: z.string(),
								organizationId: z.string(),
								role: z.enum(["MEMBER", "admin"]),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
			},
			404: { description: "Member not found" },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");
		const user = c.get("user"); // Authenticated user

		const member = await db.member.findUnique({ where: { id } });
		if (!member) {
			throw new HTTPException(404, { message: "Member not found" });
		}

		// Check if the user is authorized (admin or the member themselves)
		const isOrgMember = await db.member.findFirst({
			where: { userId: user.id, organizationId: member.organizationId },
		});
		if (!isOrgMember && user.role !== "admin") {
			throw new HTTPException(403, { message: "Forbidden" });
		}

		return c.json(member);
	},
);

// POST /members - Add a user to an organization (admin-only)
membersRouter.post(
	"/",
	adminMiddleware,
	validator("json", createMemberSchema),
	describeRoute({
		tags: ["Members"],
		summary: "Add a user to an organization",

		responses: {
			201: {
				description: "Member created",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								userId: z.string(),
								organizationId: z.string(),
								role: z.enum(["MEMBER", "ADMIN"]),
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

		// Check if the user and organization exist
		const user = await db.user.findUnique({ where: { id: data.userId } });
		if (!user) {
			throw new HTTPException(400, { message: "User not found" });
		}
		const org = await db.organization.findUnique({
			where: { id: data.organizationId },
		});
		if (!org) {
			throw new HTTPException(400, { message: "Organization not found" });
		}

		// Check for existing membership
		const existingMember = await db.member.findFirst({
			where: { userId: data.userId, organizationId: data.organizationId },
		});
		if (existingMember) {
			throw new HTTPException(400, {
				message: "User is already a member",
			});
		}

		const member = await db.member.create({
			data: {
				id: `member_${nanoid(10)}`, // Adjust ID generation as needed
				...data,
			},
		});

		return c.json(member, 201);
	},
);

// PUT /members/:id - Update a member’s role (admin-only)
membersRouter.put(
	"/:id",
	adminMiddleware,
	validator("json", updateMemberSchema),
	describeRoute({
		tags: ["Members"],
		summary: "Update a member’s role",
		responses: {
			200: {
				description: "Member updated",
				content: {
					"application/json": {
						schema: resolver(
							z.object({
								id: z.string(),
								userId: z.string(),
								organizationId: z.string(),
								role: z.enum(["MEMBER", "ADMIN"]),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
			},
			404: { description: "Member not found" },
			400: { description: "Invalid input" },
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");

		const member = await db.member.findUnique({ where: { id } });
		if (!member) {
			throw new HTTPException(404, { message: "Member not found" });
		}

		const updatedMember = await db.member.update({
			where: { id },
			data,
		});

		return c.json(updatedMember);
	},
);

// DELETE /members/:id - Remove a user from an organization (admin-only)
membersRouter.delete(
	"/:id",
	adminMiddleware,
	describeRoute({
		tags: ["Members"],
		summary: "Remove a member from an organization",
		responses: {
			204: { description: "Member removed" },
			404: { description: "Member not found" },
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const id = c.req.param("id");

		const member = await db.member.findUnique({ where: { id } });
		if (!member) {
			throw new HTTPException(404, { message: "Member not found" });
		}

		await db.member.delete({ where: { id } });

		return c.body(null, 204);
	},
);
