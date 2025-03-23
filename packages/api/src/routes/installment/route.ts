import { db } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===

const installmentStatusEnum = [
	"PENDING",
	"PAID",
	"OVERDUE",
	"CANCELLED",
] as const;

const installmentSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	saleId: z.string(),
	customerId: z.string().nullable(),
	dueDate: z.date(),
	amount: z.number(),
	paid: z.boolean().default(false),
	paidDate: z.date().nullable(),
	paymentMethod: z.string().nullable(),
	notes: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const createInstallmentSchema = z.object({
	organizationId: z.string(),
	saleId: z.string(),
	customerId: z.string().nullable(),
	dueDate: z.date(),
	amount: z.number(),
	paymentMethod: z.string().optional(),
	notes: z.string().optional(),
});

const updateInstallmentSchema = z.object({
	id: z.string(),
	dueDate: z.date().optional(),
	amount: z.number().optional(),
	paid: z.boolean().optional(),
	paidDate: z.date().optional(),
	paymentMethod: z.string().optional(),
	notes: z.string().optional(),
});

export const installmentRoute = new Hono()
	.basePath("/installments")
	// GET all installments
	.get("/", authMiddleware, async (c) => {
		try {
			const installments = await db.installment.findMany({
				orderBy: { dueDate: "asc" },
			});
			return c.json(installments);
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to fetch installments" }, 500);
		}
	})
	// GET a specific installment by ID
	.get("/:id", authMiddleware, async (c) => {
		const installmentId = c.req.param("id");

		try {
			const installment = await db.installment.findUnique({
				where: { id: installmentId },
			});

			if (!installment) {
				return c.json({ error: "Installment not found" }, 404);
			}

			return c.json(installment);
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to fetch installment" }, 500);
		}
	})
	// CREATE a new installment
	.post("/", authMiddleware, async (c) => {
		const data = await c.req.json();
		try {
			const newInstallment = await db.installment.create({
				data: data,
			});
			return c.json(newInstallment, 201);
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to create installment" }, 400);
		}
	})
	// UPDATE an existing installment
	.put("/:id", authMiddleware, async (c) => {
		const installmentId = c.req.param("id");
		const data = await c.req.json();

		try {
			const updatedInstallment = await db.installment.update({
				where: { id: installmentId },
				data: data,
			});
			return c.json(updatedInstallment);
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to update installment" }, 400);
		}
	})
	// DELETE an installment
	.delete("/:id", authMiddleware, async (c) => {
		const installmentId = c.req.param("id");

		try {
			await db.installment.delete({
				where: { id: installmentId },
			});
			return c.json({ message: "Installment deleted successfully" });
		} catch (error) {
			console.error(error);
			return c.json({ error: "Failed to delete installment" }, 500);
		}
	});
