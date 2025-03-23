import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { BookingStatus } from "@prisma/client";

const bookingStatusSchema = z.nativeEnum(BookingStatus);

const bookingSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  staffId: z.string(),
  serviceId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  status: bookingStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createBookingSchema = z.object({
  customerId: z.string(),
  staffId: z.string(),
  serviceId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  notes: z.string().optional(),
  status: bookingStatusSchema.optional().default(BookingStatus.CONFIRMED),
});

const updateBookingSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  notes: z.string().optional(),
  status: bookingStatusSchema.optional(),
});

const updateBookingStatusSchema = z.object({
  id: z.string(),
  status: bookingStatusSchema,
});

const bookingQuerySchema = z.object({
  id: z.string().optional(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional(),
  status: bookingStatusSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

const checkAvailabilitySchema = z.object({
  staffId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  excludeBookingId: z.string().optional(),
});

export const bookingRouter = createTRPCRouter({
  list: protectedProcedure
    .input(bookingQuerySchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 50;
      const { cursor, ...query } = input;

      const items = await ctx.prisma.booking.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          id: query.id,
          customerId: query.customerId,
          staffId: query.staffId,
          serviceId: query.serviceId,
          status: query.status,
          startTime: query.startDate ? { gte: query.startDate } : undefined,
          endTime: query.endDate ? { lte: query.endDate } : undefined,
        },
        orderBy: {
          startTime: "asc",
        },
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No booking with id '${input.id}'`,
        });
      }

      return booking;
    }),

  create: protectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if staff is available during the requested time
      const conflictingBookings = await ctx.prisma.booking.findMany({
        where: {
          staffId: input.staffId,
          status: { not: BookingStatus.CANCELLED },
          OR: [
            {
              // Booking starts during another booking
              startTime: {
                gte: input.startTime,
                lt: input.endTime,
              },
            },
            {
              // Booking ends during another booking
              endTime: {
                gt: input.startTime,
                lte: input.endTime,
              },
            },
            {
              // Booking encompasses another booking
              startTime: { lte: input.startTime },
              endTime: { gte: input.endTime },
            },
          ],
        },
      });

      if (conflictingBookings.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Staff is not available during the requested time",
        });
      }

      return ctx.prisma.booking.create({
        data: input,
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });
    }),

  update: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // If updating time or staff, check availability
      if ((data.startTime || data.endTime) && data.staffId) {
        const startTime = data.startTime;
        const endTime = data.endTime;
        const staffId = data.staffId;

        // Get the current booking to fill in missing data
        const currentBooking = await ctx.prisma.booking.findUnique({
          where: { id },
        });

        if (!currentBooking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No booking with id '${id}'`,
          });
        }

        const newStartTime = startTime || currentBooking.startTime;
        const newEndTime = endTime || currentBooking.endTime;
        const newStaffId = staffId || currentBooking.staffId;

        // Check for conflicts
        const conflictingBookings = await ctx.prisma.booking.findMany({
          where: {
            id: { not: id }, // Exclude the current booking
            staffId: newStaffId,
            status: { not: BookingStatus.CANCELLED },
            OR: [
              {
                startTime: {
                  gte: newStartTime,
                  lt: newEndTime,
                },
              },
              {
                endTime: {
                  gt: newStartTime,
                  lte: newEndTime,
                },
              },
              {
                startTime: { lte: newStartTime },
                endTime: { gte: newEndTime },
              },
            ],
          },
        });

        if (conflictingBookings.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Staff is not available during the requested time",
          });
        }
      }

      return ctx.prisma.booking.update({
        where: { id },
        data,
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.booking.delete({
        where: { id: input.id },
      });
    }),

  updateStatus: protectedProcedure
    .input(updateBookingStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status } = input;

      return ctx.prisma.booking.update({
        where: { id },
        data: { status },
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });
    }),

  checkAvailability: protectedProcedure
    .input(checkAvailabilitySchema)
    .query(async ({ ctx, input }) => {
      const { staffId, startTime, endTime, excludeBookingId } = input;

      const conflictingBookings = await ctx.prisma.booking.findMany({
        where: {
          staffId,
          status: { not: BookingStatus.CANCELLED },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          OR: [
            {
              startTime: {
                gte: startTime,
                lt: endTime,
              },
            },
            {
              endTime: {
                gt: startTime,
                lte: endTime,
              },
            },
            {
              startTime: { lte: startTime },
              endTime: { gte: endTime },
            },
          ],
        },
      });

      return {
        available: conflictingBookings.length === 0,
        conflictingBookings,
      };
    }),

  upcoming: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        staffId: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { customerId, staffId, limit } = input;
      const now = new Date();

      return ctx.prisma.booking.findMany({
        where: {
          customerId,
          staffId,
          startTime: { gte: now },
          status: { not: BookingStatus.CANCELLED },
        },
        orderBy: {
          startTime: "asc",
        },
        take: limit,
        include: {
          customer: true,
          staff: true,
          service: true,
        },
      });
    }),
});