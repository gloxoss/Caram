import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const rolesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const roleIdParamSchema = z.object({
	id: z.string().nonempty("Role ID is required"),
});

const createRoleSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	name: z.string().min(1, "Name is required"),
	permissions: z.record(z.array(z.string())).optional(),
});

const updateRoleSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	permissions: z.record(z.array(z.string())).optional(),
});

// Available permissions by resource
type ResourcePermissions = {
	sales: string[];
	products: string[];
	inventory: string[];
	customers: string[];
	reports: string[];
	employees: string[];
	settings: string[];
};

const availablePermissions: ResourcePermissions = {
	sales: ["read", "write", "delete"],
	products: ["read", "write", "delete"],
	inventory: ["read", "write", "delete"],
	customers: ["read", "write", "delete"],
	reports: ["read"],
	employees: ["read", "write", "delete"],
	settings: ["read", "write"],
};

// List of valid resources for type checking
const validResources = new Set(Object.keys(availablePermissions));

// === Router Definition ===
export const roleRouter = new Hono()
	.basePath("/roles")
	// GET all roles
	.get(
		"/",
		authMiddleware,
		validator("query", rolesQuerySchema),
		describeRoute({
			tags: ["Roles"],
			summary: "List all roles for an organization",
			description:
				"Retrieve a list of employee roles with optional filtering by search term",
			responses: {
				200: {
					description: "List of roles",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									roles: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												organizationId: {
													type: "string",
												},
												permissions: { type: "object" },
												employeeCount: {
													type: "number",
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
				400: {
					description: "Invalid or missing parameters",
				},
			},
		}),
		async (c) => {
			const { organizationId, search, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: Prisma.RoleWhereInput = { organizationId };

			// Add search if provided
			if (search) {
				where.name = { contains: search, mode: "insensitive" };
			}

			// Get roles with pagination
			const [roles, total] = await Promise.all([
				db.role.findMany({
					where,
					orderBy: { name: "asc" },
					take: limit,
					skip: offset,
					include: {
						_count: {
							select: { employees: true },
						},
					},
				}),
				db.role.count({ where }),
			]);

			// Format response with employee count
			const formattedRoles = roles.map((role) => ({
				...role,
				employeeCount: role._count.employees,
				_count: undefined,
			}));

			return c.json({ roles: formattedRoles, total });
		},
	)
	// GET a single role by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", roleIdParamSchema),
		describeRoute({
			tags: ["Roles"],
			summary: "Get role details",
			description: "Retrieve detailed information about a specific role",
			responses: {
				200: {
					description: "Role details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									permissions: { type: "object" },
									employees: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												user: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
														email: {
															type: "string",
														},
													},
												},
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
									availablePermissions: { type: "object" },
								},
							},
						},
					},
				},
				404: {
					description: "Role not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const role = await db.role.findUnique({
				where: { id },
				include: {
					employees: {
						take: 10,
						include: {
							user: {
								select: { name: true, email: true },
							},
						},
					},
				},
			});

			if (!role) {
				return c.json({ error: "Role not found" }, 404);
			}

			return c.json({
				...role,
				availablePermissions,
			});
		},
	)
	// CREATE a new role
	.post(
		"/",
		authMiddleware,
		validator("json", createRoleSchema),
		describeRoute({
			tags: ["Roles"],
			summary: "Create a new role",
			description: "Create a new employee role with specific permissions",
			responses: {
				201: {
					description: "Role created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									permissions: { type: "object" },
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
					description: "Role with the same name already exists",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Check if role with the same name already exists
			const existingRole = await db.role.findFirst({
				where: {
					organizationId: data.organizationId,
					name: {
						equals: data.name,
						mode: "insensitive",
					},
				},
			});

			if (existingRole) {
				return c.json(
					{
						error: "Role with this name already exists",
					},
					409,
				);
			}

			// Validate permissions if provided
			if (data.permissions) {
				// Ensure permissions are valid
				for (const resource in data.permissions) {
					if (!validResources.has(resource)) {
						return c.json(
							{
								error: `Unknown resource: ${resource}. Valid resources are: ${Object.keys(availablePermissions).join(", ")}`,
							},
							400,
						);
					}

					const resourceKey = resource as keyof ResourcePermissions;
					for (const permission of data.permissions[resource]) {
						if (
							!availablePermissions[resourceKey].includes(
								permission,
							)
						) {
							return c.json(
								{
									error: `Invalid permission '${permission}' for resource '${resource}'. Valid permissions are: ${availablePermissions[resourceKey].join(", ")}`,
								},
								400,
							);
						}
					}
				}
			}

			// Create the role
			const role = await db.role.create({
				data: {
					...data,
					permissions: data.permissions || {},
				},
			});

			return c.json(role, 201);
		},
	)
	// UPDATE a role
	.put(
		"/:id",
		authMiddleware,
		validator("param", roleIdParamSchema),
		validator("json", updateRoleSchema),
		describeRoute({
			tags: ["Roles"],
			summary: "Update a role",
			description: "Update details and permissions of an existing role",
			responses: {
				200: {
					description: "Role updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									organizationId: { type: "string" },
									permissions: { type: "object" },
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
					description: "Role not found",
				},
				409: {
					description: "Role with the same name already exists",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Get the current role to check organization
			const currentRole = await db.role.findUnique({
				where: { id },
			});

			if (!currentRole) {
				return c.json({ error: "Role not found" }, 404);
			}

			// Check if role with the same name already exists if name is being updated
			if (data.name && data.name !== currentRole.name) {
				const existingRole = await db.role.findFirst({
					where: {
						organizationId: currentRole.organizationId,
						name: {
							equals: data.name,
							mode: "insensitive",
						},
						id: { not: id }, // Exclude the current role from the check
					},
				});

				if (existingRole) {
					return c.json(
						{
							error: "Role with this name already exists",
						},
						409,
					);
				}
			}

			// Validate permissions if provided
			if (data.permissions) {
				// Ensure permissions are valid
				for (const resource in data.permissions) {
					if (!validResources.has(resource)) {
						return c.json(
							{
								error: `Unknown resource: ${resource}. Valid resources are: ${Object.keys(availablePermissions).join(", ")}`,
							},
							400,
						);
					}

					const resourceKey = resource as keyof ResourcePermissions;
					for (const permission of data.permissions[resource]) {
						if (
							!availablePermissions[resourceKey].includes(
								permission,
							)
						) {
							return c.json(
								{
									error: `Invalid permission '${permission}' for resource '${resource}'. Valid permissions are: ${availablePermissions[resourceKey].join(", ")}`,
								},
								400,
							);
						}
					}
				}
			}

			try {
				// Handle permissions update
				const updateData: any = { ...data };

				// If permissions provided, merge with existing permissions
				if (data.permissions) {
					// For a PUT request, we replace the entire permissions object
					updateData.permissions = data.permissions;
				}

				const role = await db.role.update({
					where: { id },
					data: updateData,
				});

				return c.json(role);
			} catch (error) {
				return c.json({ error: "Role not found" }, 404);
			}
		},
	)
	// PATCH permissions for a role
	.patch(
		"/:id/permissions",
		authMiddleware,
		validator("param", roleIdParamSchema),
		validator(
			"json",
			z.object({
				permissions: z.record(z.array(z.string())).optional(),
			}),
		),
		describeRoute({
			tags: ["Roles"],
			summary: "Update role permissions",
			description: "Update specific permissions for a role",
			responses: {
				200: {
					description: "Permissions updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									name: { type: "string" },
									permissions: { type: "object" },
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
					description: "Invalid permissions",
				},
				404: {
					description: "Role not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const { permissions } = c.req.valid("json");

			if (!permissions) {
				return c.json({ error: "No permissions provided" }, 400);
			}

			// Get current role and its permissions
			const currentRole = await db.role.findUnique({
				where: { id },
			});

			if (!currentRole) {
				return c.json({ error: "Role not found" }, 404);
			}

			// Validate new permissions
			for (const resource in permissions) {
				if (!validResources.has(resource)) {
					return c.json(
						{
							error: `Unknown resource: ${resource}. Valid resources are: ${Object.keys(availablePermissions).join(", ")}`,
						},
						400,
					);
				}

				const resourceKey = resource as keyof ResourcePermissions;
				for (const permission of permissions[resource]) {
					if (
						!availablePermissions[resourceKey].includes(permission)
					) {
						return c.json(
							{
								error: `Invalid permission '${permission}' for resource '${resource}'. Valid permissions are: ${availablePermissions[resourceKey].join(", ")}`,
							},
							400,
						);
					}
				}
			}

			// Merge existing permissions with new ones
			const currentPermissions =
				(currentRole.permissions as Record<string, string[]>) || {};
			const mergedPermissions = {
				...currentPermissions,
				...permissions,
			};

			// Update the role with merged permissions
			const updatedRole = await db.role.update({
				where: { id },
				data: {
					permissions: mergedPermissions,
				},
			});

			return c.json(updatedRole);
		},
	)
	// DELETE a role
	.delete(
		"/:id",
		authMiddleware,
		validator("param", roleIdParamSchema),
		describeRoute({
			tags: ["Roles"],
			summary: "Delete a role",
			description:
				"Delete an existing role (will fail if role has associated employees)",
			responses: {
				200: {
					description: "Role deleted successfully",
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
					description: "Cannot delete role with associated employees",
				},
				404: {
					description: "Role not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Check if role has associated employees
				const employeeCount = await db.employee.count({
					where: { roleId: id },
				});

				if (employeeCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete role with associated employees",
						},
						400,
					);
				}

				await db.role.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Role deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Role not found" }, 404);
			}
		},
	)
	// GET all employees with this role
	.get(
		"/:id/employees",
		authMiddleware,
		validator("param", roleIdParamSchema),
		describeRoute({
			tags: ["Roles"],
			summary: "List role employees",
			description: "Retrieve all employees assigned to a specific role",
			responses: {
				200: {
					description: "List of employees",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									employees: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												userId: { type: "string" },
												user: {
													type: "object",
													properties: {
														name: {
															type: "string",
														},
														email: {
															type: "string",
														},
														image: {
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
					description: "Role not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const limit = Number.parseInt(c.req.query("limit") || "50");
			const offset = Number.parseInt(c.req.query("offset") || "0");

			// Verify role exists
			const role = await db.role.findUnique({
				where: { id },
			});

			if (!role) {
				return c.json({ error: "Role not found" }, 404);
			}

			// Get employees with pagination
			const [employees, total] = await Promise.all([
				db.employee.findMany({
					where: { roleId: id },
					orderBy: { createdAt: "desc" },
					skip: offset,
					take: limit,
					include: {
						user: {
							select: {
								name: true,
								email: true,
								image: true,
							},
						},
					},
				}),
				db.employee.count({ where: { roleId: id } }),
			]);

			return c.json({
				employees,
				total,
			});
		},
	)
	// GET available permissions
	.get(
		"/available-permissions",
		authMiddleware,
		describeRoute({
			tags: ["Roles"],
			summary: "Get available permissions",
			description: "Retrieve all available permissions by resource",
			responses: {
				200: {
					description: "Available permissions",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									availablePermissions: {
										type: "object",
										additionalProperties: {
											type: "array",
											items: { type: "string" },
										},
									},
								},
							},
						},
					},
				},
			},
		}),
		async (c) => {
			return c.json({ availablePermissions });
		},
	);
