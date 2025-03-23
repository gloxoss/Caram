import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const attendanceQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	employeeId: z.string().optional(),
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "From date must be in YYYY-MM-DD format")
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "To date must be in YYYY-MM-DD format")
		.optional(),
	status: z
		.enum([
			"PRESENT",
			"ABSENT",
			"LATE",
			"HALF_DAY",
			"ON_LEAVE",
			"HOLIDAY",
			"WEEKEND",
		])
		.optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(31),
	offset: z.coerce.number().min(0).optional().default(0),
});

const attendanceIdParamSchema = z.object({
	id: z.string().nonempty("Attendance ID is required"),
});

const createAttendanceSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	employeeId: z.string().nonempty("Employee ID is required"),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
	status: z.enum([
		"PRESENT",
		"ABSENT",
		"LATE",
		"HALF_DAY",
		"ON_LEAVE",
		"HOLIDAY",
		"WEEKEND",
	]),
	checkInTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-in time must be in HH:MM format")
		.optional(),
	checkOutTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-out time must be in HH:MM format")
		.optional(),
	workHours: z.number().min(0).optional(),
	leaveType: z.string().optional(),
	notes: z.string().optional(),
	locationCheckIn: z.string().optional(),
	locationCheckOut: z.string().optional(),
	photoCheckIn: z.string().optional(),
	photoCheckOut: z.string().optional(),
	isManualEntry: z.boolean().optional().default(false),
	createdById: z.string().optional(),
});

const updateAttendanceSchema = z.object({
	status: z
		.enum([
			"PRESENT",
			"ABSENT",
			"LATE",
			"HALF_DAY",
			"ON_LEAVE",
			"HOLIDAY",
			"WEEKEND",
		])
		.optional(),
	checkInTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-in time must be in HH:MM format")
		.optional(),
	checkOutTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Check-out time must be in HH:MM format")
		.optional(),
	workHours: z.number().min(0).optional(),
	leaveType: z.string().optional(),
	notes: z.string().optional(),
	locationCheckIn: z.string().optional(),
	locationCheckOut: z.string().optional(),
	photoCheckIn: z.string().optional(),
	photoCheckOut: z.string().optional(),
	isManualEntry: z.boolean().optional(),
	updatedById: z.string().optional(),
});

const bulkCreateAttendanceSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	employeeIds: z
		.array(z.string())
		.nonempty("At least one employee ID is required"),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
	status: z.enum([
		"PRESENT",
		"ABSENT",
		"LATE",
		"HALF_DAY",
		"ON_LEAVE",
		"HOLIDAY",
		"WEEKEND",
	]),
	notes: z.string().optional(),
	isManualEntry: z.boolean().optional().default(true),
	createdById: z.string().optional(),
});

const summaryQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	employeeId: z.string().optional(),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
		.optional(),
});

const leaveRequestSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	employeeId: z.string().nonempty("Employee ID is required"),
	startDate: z
		.string()
		.regex(
			/^\d{4}-\d{2}-\d{2}$/,
			"Start date must be in YYYY-MM-DD format",
		),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
	leaveType: z.string().nonempty("Leave type is required"),
	reason: z.string().nonempty("Reason is required"),
	contactInfo: z.string().optional(),
	isHalfDay: z.boolean().optional().default(false),
	documents: z.array(z.string()).optional(),
	createdById: z.string().optional(),
});

// === Router Definition ===
export const attendanceRouter = new Hono()
	.basePath("/attendance")
	// GET all attendance records
	.get(
		"/",
		authMiddleware,
		validator("query", attendanceQuerySchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "List attendance records",
			description:
				"Retrieve a list of attendance records with optional filtering",
			responses: {
				200: {
					description: "List of attendance records",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									records: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												employeeId: { type: "string" },
												date: {
													type: "string",
													format: "date",
												},
												status: { type: "string" },
												checkInTime: { type: "string" },
												checkOutTime: {
													type: "string",
												},
												workHours: { type: "number" },
												notes: { type: "string" },
												employee: {
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
																image: {
																	type: "string",
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
			try {
				const {
					organizationId,
					employeeId,
					from,
					to,
					status,
					limit,
					offset,
				} = c.req.valid("query");

				// Build where clause
				const where: Prisma.AttendanceWhereInput = { organizationId };

				// Add employee filter if provided
				if (employeeId) {
					where.employeeId = employeeId;
				}

				// Add date range filter if provided
				if (from || to) {
					where.date = {};
					if (from) {
						where.date.gte = new Date(from);
					}
					if (to) {
						where.date.lte = new Date(to);
					}
				}

				// Add status filter if provided
				if (status) {
					where.status = status;
				}

				// Get attendance records with pagination
				const [records, total] = await Promise.all([
					db.attendance.findMany({
						where,
						orderBy: { date: "desc" },
						take: limit,
						skip: offset,
						include: {
							employee: {
								include: {
									user: {
										select: {
											name: true,
											email: true,
											image: true,
										},
									},
								},
							},
						},
					}),
					db.attendance.count({ where }),
				]);

				return c.json({ records, total });
			} catch (error) {
				console.error("Error fetching attendance records:", error);
				return c.json(
					{ error: "Failed to fetch attendance records" },
					500,
				);
			}
		},
	)
	// GET a single attendance record by ID
	.get(
		"/:id",
		authMiddleware,
		validator("param", attendanceIdParamSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Get attendance record details",
			description:
				"Retrieve detailed information about a specific attendance record",
			responses: {
				200: {
					description: "Attendance record details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									employeeId: { type: "string" },
									date: { type: "string", format: "date" },
									status: { type: "string" },
									checkInTime: { type: "string" },
									checkOutTime: { type: "string" },
									workHours: { type: "number" },
									leaveType: { type: "string" },
									notes: { type: "string" },
									locationCheckIn: { type: "string" },
									locationCheckOut: { type: "string" },
									photoCheckIn: { type: "string" },
									photoCheckOut: { type: "string" },
									isManualEntry: { type: "boolean" },
									employee: {
										type: "object",
										properties: {
											id: { type: "string" },
											user: {
												type: "object",
												properties: {
													name: { type: "string" },
													email: { type: "string" },
													image: { type: "string" },
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
								},
							},
						},
					},
				},
				404: {
					description: "Attendance record not found",
				},
			},
		}),
		async (c) => {
			try {
				const { id } = c.req.valid("param");

				const record = await db.attendance.findUnique({
					where: { id },
					include: {
						employee: {
							include: {
								user: {
									select: {
										name: true,
										email: true,
										image: true,
									},
								},
							},
						},
					},
				});

				if (!record) {
					return c.json(
						{ error: "Attendance record not found" },
						404,
					);
				}

				return c.json(record);
			} catch (error) {
				console.error("Error fetching attendance record:", error);
				return c.json(
					{ error: "Failed to fetch attendance record" },
					500,
				);
			}
		},
	)
	// CREATE a new attendance record
	.post(
		"/",
		authMiddleware,
		validator("json", createAttendanceSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Create a new attendance record",
			description: "Add a new attendance record for an employee",
			responses: {
				201: {
					description: "Attendance record created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									employeeId: { type: "string" },
									date: { type: "string", format: "date" },
									status: { type: "string" },
									checkInTime: { type: "string" },
									checkOutTime: { type: "string" },
									workHours: { type: "number" },
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
						"Attendance record already exists for this date and employee",
				},
			},
		}),
		async (c) => {
			try {
				const data = c.req.valid("json");

				// Verify employee exists
				const employee = await db.employee.findFirst({
					where: {
						id: data.employeeId,
						organizationId: data.organizationId,
					},
				});

				if (!employee) {
					return c.json({ error: "Employee not found" }, 404);
				}

				// Check if attendance record already exists for this date and employee
				const existingRecord = await db.attendance.findFirst({
					where: {
						employeeId: data.employeeId,
						date: new Date(data.date),
					},
				});

				if (existingRecord) {
					return c.json(
						{
							error: "Attendance record already exists for this date and employee",
						},
						409,
					);
				}

				// Calculate work hours if check-in and check-out times are provided
				let workHours = data.workHours;
				if (!workHours && data.checkInTime && data.checkOutTime) {
					const [checkInHour, checkInMinute] = data.checkInTime
						.split(":")
						.map(Number);
					const [checkOutHour, checkOutMinute] = data.checkOutTime
						.split(":")
						.map(Number);

					const checkInMinutes = checkInHour * 60 + checkInMinute;
					const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

					workHours = (checkOutMinutes - checkInMinutes) / 60;
					if (workHours < 0) {
						workHours += 24; // Handle overnight shifts
					}
				}

				// Create attendance record
				const record = await db.attendance.create({
					data: {
						organizationId: data.organizationId,
						employeeId: data.employeeId,
						date: new Date(data.date),
						status: data.status,
						checkInTime: data.checkInTime,
						checkOutTime: data.checkOutTime,
						workHours,
						leaveType: data.leaveType,
						notes: data.notes,
						locationCheckIn: data.locationCheckIn,
						locationCheckOut: data.locationCheckOut,
						photoCheckIn: data.photoCheckIn,
						photoCheckOut: data.photoCheckOut,
						isManualEntry: data.isManualEntry ?? true,
						createdById: data.createdById,
					},
				});

				return c.json(record, 201);
			} catch (error) {
				console.error("Error creating attendance record:", error);
				return c.json(
					{ error: "Failed to create attendance record" },
					500,
				);
			}
		},
	)
	// UPDATE an attendance record
	.put(
		"/:id",
		authMiddleware,
		validator("param", attendanceIdParamSchema),
		validator("json", updateAttendanceSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Update an attendance record",
			description: "Update details of an existing attendance record",
			responses: {
				200: {
					description: "Attendance record updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									organizationId: { type: "string" },
									employeeId: { type: "string" },
									date: { type: "string", format: "date" },
									status: { type: "string" },
									checkInTime: { type: "string" },
									checkOutTime: { type: "string" },
									workHours: { type: "number" },
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
					description: "Attendance record not found",
				},
			},
		}),
		async (c) => {
			try {
				const { id } = c.req.valid("param");
				const data = c.req.valid("json");

				// Calculate work hours if check-in and check-out times are provided
				let workHours = data.workHours;
				if (data.checkInTime && data.checkOutTime && !data.workHours) {
					const [checkInHour, checkInMinute] = data.checkInTime
						.split(":")
						.map(Number);
					const [checkOutHour, checkOutMinute] = data.checkOutTime
						.split(":")
						.map(Number);

					const checkInMinutes = checkInHour * 60 + checkInMinute;
					const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

					workHours = (checkOutMinutes - checkInMinutes) / 60;
					if (workHours < 0) {
						workHours += 24; // Handle overnight shifts
					}
				}

				// Update attendance record
				const record = await db.attendance.update({
					where: { id },
					data: {
						...data,
						workHours,
						updatedAt: new Date(),
					},
				});

				return c.json(record);
			} catch (error) {
				console.error("Error updating attendance record:", error);
				if ((error as any).code === "P2025") {
					return c.json(
						{ error: "Attendance record not found" },
						404,
					);
				}
				return c.json(
					{ error: "Failed to update attendance record" },
					500,
				);
			}
		},
	)
	// DELETE an attendance record
	.delete(
		"/:id",
		authMiddleware,
		validator("param", attendanceIdParamSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Delete an attendance record",
			description: "Remove an attendance record",
			responses: {
				200: {
					description: "Attendance record deleted successfully",
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
					description: "Attendance record not found",
				},
			},
		}),
		async (c) => {
			try {
				const { id } = c.req.valid("param");

				await db.attendance.delete({
					where: { id },
				});

				return c.json({
					success: true,
					message: "Attendance record deleted successfully",
				});
			} catch (error) {
				console.error("Error deleting attendance record:", error);
				if ((error as any).code === "P2025") {
					return c.json(
						{ error: "Attendance record not found" },
						404,
					);
				}
				return c.json(
					{ error: "Failed to delete attendance record" },
					500,
				);
			}
		},
	)
	// BULK CREATE attendance records
	.post(
		"/bulk",
		authMiddleware,
		validator("json", bulkCreateAttendanceSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Create multiple attendance records",
			description:
				"Add attendance records for multiple employees at once",
			responses: {
				201: {
					description: "Attendance records created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									count: { type: "number" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: {
					description: "Invalid input",
				},
			},
		}),
		async (c) => {
			try {
				const {
					organizationId,
					employeeIds,
					date,
					status,
					notes,
					isManualEntry,
					createdById,
				} = c.req.valid("json");

				// Verify employees exist
				const employees = await db.employee.findMany({
					where: {
						id: { in: employeeIds },
						organizationId,
					},
				});

				if (employees.length !== employeeIds.length) {
					return c.json(
						{ error: "One or more employees not found" },
						404,
					);
				}

				// Check for existing records
				const existingRecords = await db.attendance.findMany({
					where: {
						employeeId: { in: employeeIds },
						date: new Date(date),
					},
					select: { employeeId: true },
				});

				const existingEmployeeIds = existingRecords.map(
					(record) => record.employeeId,
				);
				const newEmployeeIds = employeeIds.filter(
					(id) => !existingEmployeeIds.includes(id),
				);

				if (newEmployeeIds.length === 0) {
					return c.json(
						{
							success: false,
							count: 0,
							message:
								"All employees already have attendance records for this date",
						},
						409,
					);
				}

				// Create attendance records
				const records = await db.attendance.createMany({
					data: newEmployeeIds.map((employeeId) => ({
						organizationId,
						employeeId,
						date: new Date(date),
						status,
						notes,
						isManualEntry: isManualEntry ?? true,
						createdById,
					})),
				});

				return c.json(
					{
						success: true,
						count: records.count,
						message: `Created ${records.count} attendance records successfully`,
					},
					201,
				);
			} catch (error) {
				console.error("Error creating bulk attendance records:", error);
				return c.json(
					{ error: "Failed to create attendance records" },
					500,
				);
			}
		},
	)
	// GET attendance summary
	.get(
		"/summary",
		authMiddleware,
		validator("query", summaryQuerySchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Get attendance summary",
			description:
				"Retrieve attendance summary statistics for an organization or employee",
			responses: {
				200: {
					description: "Attendance summary",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									summary: {
										type: "object",
										properties: {
											present: { type: "number" },
											absent: { type: "number" },
											late: { type: "number" },
											halfDay: { type: "number" },
											onLeave: { type: "number" },
											holiday: { type: "number" },
											weekend: { type: "number" },
											total: { type: "number" },
										},
									},
									employeeSummaries: {
										type: "array",
										items: {
											type: "object",
											properties: {
												employeeId: { type: "string" },
												employeeName: {
													type: "string",
												},
												present: { type: "number" },
												absent: { type: "number" },
												late: { type: "number" },
												halfDay: { type: "number" },
												onLeave: { type: "number" },
												holiday: { type: "number" },
												weekend: { type: "number" },
												total: { type: "number" },
											},
										},
									},
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
			try {
				const { organizationId, employeeId, month } =
					c.req.valid("query");

				// Calculate date range for the query
				// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
				let startDate: Date, endDate: Date;

				if (month) {
					const [year, monthNum] = month.split("-").map(Number);
					startDate = new Date(year, monthNum - 1, 1);
					endDate = new Date(year, monthNum, 0); // Last day of the month
				} else {
					// Default to current month
					const now = new Date();
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					endDate = new Date(
						now.getFullYear(),
						now.getMonth() + 1,
						0,
					);
				}

				// Build where clause
				const where: Prisma.AttendanceWhereInput = {
					organizationId,
					date: {
						gte: startDate,
						lte: endDate,
					},
				};

				if (employeeId) {
					where.employeeId = employeeId;
				}

				// Get attendance statistics
				const attendanceStats = await db.attendance.groupBy({
					by: ["status"],
					where,
					_count: {
						status: true,
					},
				});

				// Format overall summary
				const summary = {
					present: 0,
					absent: 0,
					late: 0,
					halfDay: 0,
					onLeave: 0,
					holiday: 0,
					weekend: 0,
					total: 0,
				};

				attendanceStats.forEach((stat) => {
					if (stat.status === "PRESENT")
						summary.present = stat._count.status;
					if (stat.status === "ABSENT")
						summary.absent = stat._count.status;
					// biome-ignore lint/style/useBlockStatements: <explanation>
					if (stat.status === "LATE")
						summary.late = stat._count.status;
					if (stat.status === "HALF_DAY")
						summary.halfDay = stat._count.status;
					if (stat.status === "ON_LEAVE")
						summary.onLeave = stat._count.status;
					if (stat.status === "HOLIDAY")
						summary.holiday = stat._count.status;
					if (stat.status === "WEEKEND")
						summary.weekend = stat._count.status;
				});

				summary.total =
					summary.present +
					summary.absent +
					summary.late +
					summary.halfDay +
					summary.onLeave +
					summary.holiday +
					summary.weekend;

				// If specific employee requested, return just the summary
				if (employeeId) {
					return c.json({ summary });
				}

				// Otherwise, get per-employee summaries
				const employees = await db.employee.findMany({
					where: { organizationId },
					include: {
						user: {
							select: {
								name: true,
							},
						},
					},
				});

				// Get attendance data for all employees
				const employeeAttendance = await db.attendance.findMany({
					where: {
						organizationId,
						date: {
							gte: startDate,
							lte: endDate,
						},
					},
					select: {
						employeeId: true,
						status: true,
					},
				});

				// Group attendance by employee
				const employeeAttendanceMap: Record<
					string,
					Record<string, number>
				> = {};

				employeeAttendance.forEach((record) => {
					if (!employeeAttendanceMap[record.employeeId]) {
						employeeAttendanceMap[record.employeeId] = {
							PRESENT: 0,
							ABSENT: 0,
							LATE: 0,
							HALF_DAY: 0,
							ON_LEAVE: 0,
							HOLIDAY: 0,
							WEEKEND: 0,
						};
					}

					employeeAttendanceMap[record.employeeId][record.status]++;
				});

				// Format employee summaries
				const employeeSummaries = employees.map((employee) => {
					const stats = employeeAttendanceMap[employee.id] || {
						PRESENT: 0,
						ABSENT: 0,
						LATE: 0,
						HALF_DAY: 0,
						ON_LEAVE: 0,
						HOLIDAY: 0,
						WEEKEND: 0,
					};

					const total =
						stats.PRESENT +
						stats.ABSENT +
						stats.LATE +
						stats.HALF_DAY +
						stats.ON_LEAVE +
						stats.HOLIDAY +
						stats.WEEKEND;

					return {
						employeeId: employee.id,
						employeeName: employee.user.name,
						present: stats.PRESENT,
						absent: stats.ABSENT,
						late: stats.LATE,
						halfDay: stats.HALF_DAY,
						onLeave: stats.ON_LEAVE,
						holiday: stats.HOLIDAY,
						weekend: stats.WEEKEND,
						total,
					};
				});

				return c.json({ summary, employeeSummaries });
			} catch (error) {
				console.error("Error fetching attendance summary:", error);
				return c.json(
					{ error: "Failed to fetch attendance summary" },
					500,
				);
			}
		},
	)
	// CREATE leave request
	.post(
		"/leave-request",
		authMiddleware,
		validator("json", leaveRequestSchema),
		describeRoute({
			tags: ["Attendance"],
			summary: "Create a leave request",
			description: "Submit a new leave request for an employee",
			responses: {
				201: {
					description: "Leave request created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									id: { type: "string" },
									employeeId: { type: "string" },
									startDate: {
										type: "string",
										format: "date",
									},
									endDate: { type: "string", format: "date" },
									leaveType: { type: "string" },
									status: { type: "string" },
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
			},
		}),
		async (c) => {
			try {
				const data = c.req.valid("json");

				// Verify employee exists
				const employee = await db.employee.findFirst({
					where: {
						id: data.employeeId,
						organizationId: data.organizationId,
					},
				});

				if (!employee) {
					return c.json({ error: "Employee not found" }, 404);
				}

				// Calculate number of days
				const startDate = new Date(data.startDate);
				const endDate = new Date(data.endDate);
				const diffTime = Math.abs(
					endDate.getTime() - startDate.getTime(),
				);
				const diffDays =
					Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates

				const numberOfDays = data.isHalfDay ? 0.5 : diffDays;

				try {
					// Create leave request
					const leaveRequest = await db.leaveRequest.create({
						data: {
							organizationId: data.organizationId,
							employeeId: data.employeeId,
							startDate,
							endDate,
							leaveType: data.leaveType,
							reason: data.reason,
							contactInfo: data.contactInfo,
							isHalfDay: data.isHalfDay ?? false,
							numberOfDays,
							status: "PENDING",
							documents: data.documents || [],
							createdById: data.createdById,
						},
					});

					return c.json(leaveRequest, 201);
				} catch (error) {
					console.error(
						"Error creating leave request, falling back to attendance:",
						error,
					);

					// Fallback: Create attendance records with ON_LEAVE status
					// This is useful if the LeaveRequest model doesn't exist yet
					const dates: Date[] = [];
					const currentDate = new Date(startDate);

					while (currentDate <= endDate) {
						dates.push(new Date(currentDate));
						currentDate.setDate(currentDate.getDate() + 1);
					}

					const attendanceRecords = await db.attendance.createMany({
						data: dates.map((date) => ({
							organizationId: data.organizationId,
							employeeId: data.employeeId,
							date,
							status: "ON_LEAVE",
							leaveType: data.leaveType,
							notes: data.reason,
							isManualEntry: true,
							createdById: data.createdById,
						})),
						skipDuplicates: true,
					});

					return c.json(
						{
							success: true,
							message: `Created ${attendanceRecords.count} leave attendance records`,
							startDate: data.startDate,
							endDate: data.endDate,
							leaveType: data.leaveType,
							status: "PROCESSED",
						},
						201,
					);
				}
			} catch (error) {
				console.error("Error creating leave request:", error);
				return c.json({ error: "Failed to create leave request" }, 500);
			}
		},
	);
