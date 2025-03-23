import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const employeesQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	search: z.string().optional(),
	roleId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0),
});

const employeeIdParamSchema = z.object({
	id: z.string().nonempty("Employee ID is required"),
});

const createEmployeeSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	userId: z.string().nonempty("User ID is required"),
	roleId: z.string().nonempty("Role ID is required"),
});

const updateEmployeeSchema = z.object({
	roleId: z.string().optional(),
});

// Attendance schema
const createAttendanceSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
	checkIn: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-in time must be in HH:MM format"),
	checkOut: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-out time must be in HH:MM format")
		.optional(),
	status: z.enum(["present", "absent", "half-day", "late"]),
	note: z.string().optional(),
});

const attendanceQuerySchema = z.object({
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "From date must be in YYYY-MM-DD format")
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "To date must be in YYYY-MM-DD format")
		.optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(31),
	offset: z.coerce.number().min(0).optional().default(0),
});

// === Router Definition ===
export const employeeRouter = new Hono()
	.basePath("/employees")
	// GET all employees
	.get(
		"/",
		authMiddleware,
		validator("query", employeesQuerySchema),
		describeRoute({
			tags: ["Employees"],
			summary: "List all employees for an organization",
			description:
				"Retrieve a list of employees with optional filtering by search term or role",
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
												user: {
													type: "object",
													properties: {
														id: { type: "string" },
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
												role: {
													type: "object",
													properties: {
														id: { type: "string" },
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
				400: {
					description: "Invalid or missing parameters",
				},
			},
		}),
		async (c) => {
			const { organizationId, search, roleId, limit, offset } =
				c.req.valid("query");

			// Build where clause
			const where: Prisma.EmployeeWhereInput = { organizationId };

			// Add role filter if provided
			if (roleId) {
				where.roleId = roleId;
			}

			// Add search if provided
			if (search) {
				where.user = {
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ email: { contains: search, mode: "insensitive" } },
					],
				};
			}

			// Get employees with pagination
			const [employees, total] = await Promise.all([
				db.employee.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
						role: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				}),
				db.employee.count({ where }),
			]);

			return c.json({ employees, total });
		},
	)
	// GET a single employee by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", employeeIdParamSchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Get employee details",
			description:
				"Retrieve detailed information about a specific employee",
			responses: {
				200: {
					description: "Employee details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									userId: { type: "string" },
									roleId: { type: "string" },
									user: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
											email: { type: "string" },
											image: { type: "string" },
										},
									},
									role: {
										type: "object",
										properties: {
											id: { type: "string" },
											name: { type: "string" },
											permissions: { type: "object" },
										},
									},
									attendanceStats: {
										type: "object",
										properties: {
											present: { type: "number" },
											absent: { type: "number" },
											late: { type: "number" },
											halfDay: { type: "number" },
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
					},
				},
				404: {
					description: "Employee not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			const employee = await db.employee.findUnique({
				where: { id },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					role: true,
				},
			});

			if (!employee) {
				return c.json({ error: "Employee not found" }, 404);
			}

			// Get attendance stats for the current month
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0,
			);

			const attendanceStats = await db.attendance.groupBy({
				by: ["status"],
				where: {
					employeeId: id,
					date: {
						gte: startOfMonth,
						lte: endOfMonth,
					},
				},
				_count: {
					status: true,
				},
			});

			// Format attendance stats
			const stats = {
				present: 0,
				absent: 0,
				late: 0,
				halfDay: 0,
			};

			attendanceStats.forEach((stat) => {
				if (stat.status === "present")
					stats.present = stat._count.status;
				if (stat.status === "absent") stats.absent = stat._count.status;
				if (stat.status === "late") stats.late = stat._count.status;
				if (stat.status === "half-day")
					stats.halfDay = stat._count.status;
			});

			return c.json({
				...employee,
				attendanceStats: stats,
			});
		},
	)
	// CREATE a new employee
	.post(
		"/",
		authMiddleware,
		validator("json", createEmployeeSchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Create a new employee",
			description: "Add a new employee to the organization",
			responses: {
				201: {
					description: "Employee created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									userId: { type: "string" },
									roleId: { type: "string" },
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
					description: "User or role not found",
				},
				409: {
					description:
						"User is already an employee in this organization",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Verify user exists
			const user = await db.user.findUnique({
				where: { id: data.userId },
			});

			if (!user) {
				return c.json({ error: "User not found" }, 404);
			}

			// Verify role exists
			const role = await db.role.findUnique({
				where: { id: data.roleId },
			});

			if (!role) {
				return c.json({ error: "Role not found" }, 404);
			}

			// Check if this user is already an employee in this organization
			const existingEmployee = await db.employee.findFirst({
				where: {
					userId: data.userId,
					organizationId: data.organizationId,
				},
			});

			if (existingEmployee) {
				return c.json(
					{
						error: "User is already an employee in this organization",
					},
					409,
				);
			}

			// Create the employee
			const employee = await db.employee.create({
				data,
			});

			return c.json(employee, 201);
		},
	)
	// UPDATE an employee
	.put(
		"/:id",
		authMiddleware,
		validator("param", employeeIdParamSchema),
		validator("json", updateEmployeeSchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Update an employee",
			description: "Update details of an existing employee",
			responses: {
				200: {
					description: "Employee updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									userId: { type: "string" },
									roleId: { type: "string" },
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
					description: "Employee or role not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Verify role exists if provided
			if (data.roleId) {
				const role = await db.role.findUnique({
					where: { id: data.roleId },
				});

				if (!role) {
					return c.json({ error: "Role not found" }, 404);
				}
			}

			try {
				const employee = await db.employee.update({
					where: { id },
					data,
				});

				return c.json(employee);
			} catch (error) {
				return c.json({ error: "Employee not found" }, 404);
			}
		},
	)
	// DELETE an employee
	.delete(
		"/:id",
		authMiddleware,
		validator("param", employeeIdParamSchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Delete an employee",
			description: "Remove an employee from the organization",
			responses: {
				200: {
					description: "Employee deleted successfully",
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
					description: "Cannot delete employee with associated data",
				},
				404: {
					description: "Employee not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");

			try {
				// Check if employee has attendance or payroll records
				const [attendanceCount, payrollCount] = await Promise.all([
					db.attendance.count({ where: { employeeId: id } }),
					db.payroll.count({ where: { employeeId: id } }),
				]);

				if (attendanceCount > 0 || payrollCount > 0) {
					return c.json(
						{
							success: false,
							error: "Cannot delete employee with associated attendance or payroll records",
						},
						400,
					);
				}

				await db.employee.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Employee deleted successfully",
				});
			} catch (error) {
				return c.json({ error: "Employee not found" }, 404);
			}
		},
	)
	// GET attendance records for an employee
	.get(
		"/:id/attendance",
		authMiddleware,
		validator("param", employeeIdParamSchema),
		validator("query", attendanceQuerySchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Get employee attendance",
			description: "Retrieve attendance records for a specific employee",
			responses: {
				200: {
					description: "Attendance records",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									attendance: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												date: {
													type: "string",
													format: "date",
												},
												checkIn: { type: "string" },
												checkOut: { type: "string" },
												status: { type: "string" },
												note: { type: "string" },
												createdAt: {
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
					description: "Employee not found",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const { from, to, limit, offset } = c.req.valid("query");

			// Verify employee exists
			const employee = await db.employee.findUnique({
				where: { id },
			});

			if (!employee) {
				return c.json({ error: "Employee not found" }, 404);
			}

			// Build where clause for date filtering
			const where: Prisma.AttendanceWhereInput = { employeeId: id };

			if (from || to) {
				where.date = {};

				if (from) {
					where.date.gte = new Date(from);
				}

				if (to) {
					where.date.lte = new Date(to);
				}
			}

			// Get attendance records with pagination
			const [attendance, total] = await Promise.all([
				db.attendance.findMany({
					where,
					orderBy: { date: "desc" },
					take: limit,
					skip: offset,
				}),
				db.attendance.count({ where }),
			]);

			return c.json({ attendance, total });
		},
	)
	// CREATE attendance record for an employee
	.post(
		"/:id/attendance",
		authMiddleware,
		validator("param", employeeIdParamSchema),
		validator("json", createAttendanceSchema),
		describeRoute({
			tags: ["Employees"],
			summary: "Record employee attendance",
			description: "Create a new attendance record for an employee",
			responses: {
				201: {
					description: "Attendance recorded successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									employeeId: { type: "string" },
									date: { type: "string", format: "date" },
									checkIn: { type: "string" },
									checkOut: { type: "string" },
									status: { type: "string" },
									note: { type: "string" },
									createdAt: {
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
					description: "Employee not found",
				},
				409: {
					description:
						"Attendance record already exists for this date",
				},
			},
		}),
		async (c) => {
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Verify employee exists
			const employee = await db.employee.findUnique({
				where: { id },
				select: { organizationId: true },
			});

			if (!employee) {
				return c.json({ error: "Employee not found" }, 404);
			}

			// Check if attendance record already exists for this date
			const existingAttendance = await db.attendance.findFirst({
				where: {
					employeeId: id,
					date: new Date(data.date),
				},
			});

			if (existingAttendance) {
				return c.json(
					{
						error: "Attendance record already exists for this date",
					},
					409,
				);
			}

			// Create attendance record
			const attendance = await db.attendance.create({
				data: {
					employeeId: id,
					organizationId: employee.organizationId,
					date: new Date(data.date),
					status: data.status,
				},
			});

			return c.json(attendance, 201);
		},
	);
