import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const bookingStatusEnum = z.enum(["pending", "confirmed", "cancelled", "completed"]);

const bookingsQuerySchema = z.object({
  organizationId: z.string().nonempty("Organization ID is required"),
  customerId: z.string().optional(),
  status: bookingStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

const bookingIdParamSchema = z.object({
  id: z.string().nonempty("Booking ID is required"),
});

const createBookingSchema = z.object({
  organizationId: z.string().nonempty("Organization ID is required"),
  customerId: z.string().nonempty("Customer ID is required"),
  date: z.coerce.date(),
  status: bookingStatusEnum.optional().default("pending"),
  notes: z.string().optional(),
});

const updateBookingSchema = z.object({
  customerId: z.string().optional(),
  date: z.coerce.date().optional(),
  status: bookingStatusEnum.optional(),
  notes: z.string().optional(),
});

const updateBookingStatusSchema = z.object({
  status: bookingStatusEnum,
});

export const bookingRouter = new Hono()
  .basePath("/bookings")
  // GET all bookings
  .get(
    "/",
    authMiddleware,
    validator("query", bookingsQuerySchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "List all bookings for an organization",
      description: "Retrieve a list of bookings with optional filtering",
      responses: {
        200: {
          description: "List of bookings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bookings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        customerId: { type: "string" },
                        date: { type: "string", format: "date-time" },
                        status: { type: "string" },
                        notes: { type: "string" },
                        organizationId: { type: "string" },
                        customer: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" },
                          },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
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
      const { organizationId, customerId, status, startDate, endDate, search, limit, offset } = c.req.valid("query");

      // Build where clause
      const where: any = { organizationId };

      // Add customer filter if provided
      if (customerId) {
        where.customerId = customerId;
      }

      // Add status filter if provided
      if (status) {
        where.status = status;
      }

      // Add date range filters if provided
      if (startDate) {
        where.date = { ...(where.date || {}), gte: startDate };
      }

      if (endDate) {
        where.date = { ...(where.date || {}), lte: endDate };
      }

      // Add search if provided (search in customer name via relation)
      if (search) {
        where.OR = [
          {
            customer: {
              name: { contains: search, mode: "insensitive" },
            },
          },
          {
            notes: { contains: search, mode: "insensitive" },
          },
        ];
      }

      // Get bookings with pagination
      const [bookings, total] = await Promise.all([
        db.booking.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: limit,
          skip: offset,
        }),
        db.booking.count({ where }),
      ]);

      return c.json({ bookings, total });
    }
  )
  // GET a single booking by ID
  .get(
    "/:id",
    authMiddleware,
    validator("param", bookingIdParamSchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "Get booking details",
      description: "Retrieve detailed information about a specific booking",
      responses: {
        200: {
          description: "Booking details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  customerId: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  status: { type: "string" },
                  notes: { type: "string" },
                  organizationId: { type: "string" },
                  customer: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      address: { type: "string" },
                    },
                  },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        404: {
          description: "Booking not found",
        },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");

      const booking = await db.booking.findUnique({
        where: { id },
        include: {
          customer: true,
        },
      });

      if (!booking) {
        return c.json({ error: "Booking not found" }, 404);
      }

      return c.json(booking);
    }
  )
  // CREATE a new booking
  .post(
    "/",
    authMiddleware,
    validator("json", createBookingSchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "Create a new booking",
      description: "Create a new booking associated with an organization and customer",
      responses: {
        201: {
          description: "Booking created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  customerId: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  status: { type: "string" },
                  notes: { type: "string" },
                  organizationId: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid input",
        },
        404: {
          description: "Customer not found",
        },
      },
    }),
    async (c) => {
      const data = c.req.valid("json");

      // Verify customer exists
      const customer = await db.customer.findUnique({
        where: { 
          id: data.customerId,
          organizationId: data.organizationId,
        },
      });

      if (!customer) {
        return c.json({ error: "Customer not found" }, 404);
      }

      const booking = await db.booking.create({
        data,
      });

      return c.json(booking, 201);
    }
  )
  // UPDATE a booking
  .put(
    "/:id",
    authMiddleware,
    validator("param", bookingIdParamSchema),
    validator("json", updateBookingSchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "Update a booking",
      description: "Update details of an existing booking",
      responses: {
        200: {
          description: "Booking updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  customerId: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  status: { type: "string" },
                  notes: { type: "string" },
                  organizationId: { type: "string" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        404: {
          description: "Booking not found",
        },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");

      // If customerId is provided, verify customer exists
      if (data.customerId) {
        const booking = await db.booking.findUnique({
          where: { id },
          select: { organizationId: true },
        });

        if (!booking) {
          return c.json({ error: "Booking not found" }, 404);
        }

        const customer = await db.customer.findUnique({
          where: { 
            id: data.customerId,
            organizationId: booking.organizationId,
          },
        });

        if (!customer) {
          return c.json({ error: "Customer not found" }, 404);
        }
      }

      try {
        const booking = await db.booking.update({
          where: { id },
          data,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        return c.json(booking);
      } catch (error) {
        return c.json({ error: "Booking not found" }, 404);
      }
    }
  )
  // UPDATE booking status
  .patch(
    "/:id/status",
    authMiddleware,
    validator("param", bookingIdParamSchema),
    validator("json", updateBookingStatusSchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "Update booking status",
      description: "Update the status of an existing booking",
      responses: {
        200: {
          description: "Booking status updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  status: { type: "string" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        404: {
          description: "Booking not found",
        },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");

      try {
        const booking = await db.booking.update({
          where: { id },
          data: { status },
          select: {
            id: true,
            status: true,
            updatedAt: true,
          },
        });

        return c.json(booking);
      } catch (error) {
        return c.json({ error: "Booking not found" }, 404);
      }
    }
  )
  // DELETE a booking
  .delete(
    "/:id",
    authMiddleware,
    validator("param", bookingIdParamSchema),
    describeRoute({
      tags: ["Bookings"],
      summary: "Delete a booking",
      description: "Delete an existing booking",
      responses: {
        200: {
          description: "Booking deleted successfully",
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
          description: "Booking not found",
        },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        await db.booking.delete({
          where: { id },
        });

        return c.json({
          success: true,
          message: "Booking deleted successfully",
        });
      } catch (error) {
        return c.json({ error: "Booking not found" }, 404);
      }
    }
  )
  // GET upcoming bookings
  .get(
    "/upcoming",
    authMiddleware,
    validator("query", z.object({
      organizationId: z.string().nonempty("Organization ID is required"),
      customerId: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(10),
    })),
    describeRoute({
      tags: ["Bookings"],
      summary: "Get upcoming bookings",
      description: "Retrieve upcoming bookings for an organization or specific customer",
      responses: {
        200: {
          description: "List of upcoming bookings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bookings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        customerId: { type: "string" },
                        date: { type: "string", format: "date-time" },
                        status: { type: "string" },
                        customer: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                          },
                        },
                      },
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
      const { organizationId, customerId, limit } = c.req.valid("query");
      const now = new Date();

      const where: any = {
        organizationId,
        date: { gte: now },
        status: { not: "cancelled" },
      };

      if (customerId) {
        where.customerId = customerId;
      }

      const bookings = await db.booking.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
        take: limit,
      });

      return c.json({ bookings });
    }
  )
  // GET bookings by date range
  .get(
    "/calendar",
    authMiddleware,
    validator("query", z.object({
      organizationId: z.string().nonempty("Organization ID is required"),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })),
    describeRoute({
      tags: ["Bookings"],
      summary: "Get bookings for calendar view",
      description: "Retrieve bookings within a date range for calendar display",
      responses: {
        200: {
          description: "List of bookings in date range",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bookings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        customerId: { type: "string" },
                        date: { type: "string", format: "date-time" },
                        status: { type: "string" },
                        customer: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                          },
                        },
                      },
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
      const { organizationId, startDate, endDate } = c.req.valid("query");
      
      const start = startDate || new Date();
      let end = endDate;
      
      if (!end) {
        // Default to 30 days from start if no end date provided
        end = new Date(start);
        end.setDate(end.getDate() + 30);
      }

      const bookings = await db.booking.findMany({
        where: {
          organizationId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      return c.json({ bookings });
    }
  );