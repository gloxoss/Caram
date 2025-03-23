import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";

// === Schema Definitions ===
const quotationStatusEnum = [
	"DRAFT",
	"SENT",
	"ACCEPTED",
	"REJECTED",
	"EXPIRED",
	"CONVERTED",
] as const;

// Query schema for listing quotations
const quotationsQuerySchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	status: z.enum(quotationStatusEnum).optional(),
	customerId: z.string().optional(),
	bookingId: z.string().optional(),
	fromDate: z.string().optional(),
	toDate: z.string().optional(),
	search: z.string().optional(),
});

// Schema for quotation item
const quotationItemSchema = z.object({
	productId: z.string(),
	quantity: z.number().positive(),
	unitPrice: z.number().nonnegative(),
	discount: z.number().min(0).max(100).optional().default(0),
	tax: z.number().min(0).max(100).optional().default(0),
	description: z.string().optional(),
});

// Schema for creating a quotation
const createQuotationSchema = z.object({
	organizationId: z.string().nonempty("Organization ID is required"),
	customerId: z.string().optional(),
	customerName: z.string().optional(),
	customerEmail: z.string().email().optional(),
	customerPhone: z.string().optional(),
	customerAddress: z.string().optional(),
	bookingId: z.string().optional(),
	validUntil: z.string().transform((val) => new Date(val)),
	notes: z.string().optional(),
	termsAndConditions: z.string().optional(),
	discount: z.number().min(0).max(100).optional().default(0),
	tax: z.number().min(0).max(100).optional().default(0),
	items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

// Customer info validation - either customerId or customer details required
createQuotationSchema.refine(
	(data) => data.customerId || (data.customerName && data.customerEmail),
	{
		message:
			"Either customer ID or customer details (name and email) are required",
		path: ["customerId"],
	},
);

// Schema for updating a quotation
const updateQuotationSchema = z.object({
	customerId: z.string().optional(),
	customerName: z.string().optional(),
	customerEmail: z.string().email().optional(),
	customerPhone: z.string().optional(),
	customerAddress: z.string().optional(),
	validUntil: z
		.string()
		.transform((val) => new Date(val))
		.optional(),
	notes: z.string().optional(),
	termsAndConditions: z.string().optional(),
	discount: z.number().min(0).max(100).optional(),
	tax: z.number().min(0).max(100).optional(),
	items: z.array(quotationItemSchema).optional(),
	status: z.enum(quotationStatusEnum).optional(),
});

// Schema for updating quotation status
const updateStatusSchema = z.object({
	status: z.enum(quotationStatusEnum),
	notes: z.string().optional(),
	rejectionReason: z.string().optional(),
});

// Schema for converting quotation to order/sale
const convertToOrderSchema = z.object({
	paymentMethod: z.string().optional(),
	paymentTerms: z.string().optional(),
	notes: z.string().optional(),
	requestDeposit: z.boolean().optional().default(false),
	depositAmount: z.number().optional(),
	requestPayment: z.boolean().optional().default(false),
});

export const quotationRouter = new Hono()
	.basePath("/quotation")
	// GET all quotations
	.get(
		"/",
		authMiddleware,
		validator("query", quotationsQuerySchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "List quotations",
			description:
				"Retrieve a list of quotations with optional filtering",
			responses: {
				200: {
					description: "List of quotations",
				},
			},
		}),
		async (c) => {
			const {
				organizationId,
				status,
				customerId,
				bookingId,
				fromDate,
				toDate,
				search,
			} = c.req.valid("query");

			// Build the where clause
			const where: any = {
				organizationId,
				...(status && { status }),
				...(customerId && { customerId }),
				...(bookingId && { bookingId }),
			};

			// Add date filtering if specified
			if (fromDate || toDate) {
				where.createdAt = {};
				if (fromDate) where.createdAt.gte = new Date(fromDate);
				if (toDate) where.createdAt.lte = new Date(toDate);
			}

			// Add search functionality
			if (search) {
				where.OR = [
					{
						quotationNumber: {
							contains: search,
							mode: "insensitive",
						},
					},
					{ customerName: { contains: search, mode: "insensitive" } },
					{
						customerEmail: {
							contains: search,
							mode: "insensitive",
						},
					},
					{ notes: { contains: search, mode: "insensitive" } },
				];
			}

			try {
				const quotations = await db.quotation.findMany({
					where,
					orderBy: { createdAt: "desc" },
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
								contact: true,
							},
						},
						booking: {
							select: {
								id: true,
								title: true,
								type: true,
								startDate: true,
							},
						},
						items: {
							include: {
								product: {
									select: {
										id: true,
										name: true,
										sku: true,
									},
								},
							},
						},
						createdBy: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				});

				return c.json({
					items: quotations,
					count: quotations.length,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch quotations",
						details: error,
					},
					500,
				);
			}
		},
	)
	// GET a specific quotation by ID
	.get(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Quotation"],
			summary: "Get quotation details",
			description:
				"Retrieve detailed information about a specific quotation",
			responses: {
				200: {
					description: "Quotation details",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");

			try {
				const quotation = await db.quotation.findUnique({
					where: { id: quotationId },
					include: {
						customer: {
							select: {
								id: true,
								name: true,
								email: true,
								contact: true,
								address: true,
							},
						},
						booking: {
							select: {
								id: true,
								title: true,
								type: true,
								startDate: true,
								description: true,
							},
						},
						items: {
							include: {
								product: {
									select: {
										id: true,
										name: true,
										description: true,
										sku: true,
										price: true,
										unitOfMeasure: true,
										category: {
											select: {
												id: true,
												name: true,
											},
										},
									},
								},
							},
						},
						createdBy: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
								address: true,
								logo: true,
							},
						},
						sale: {
							select: {
								id: true,
								saleNumber: true,
								totalAmount: true,
								status: true,
								createdAt: true,
							},
						},
					},
				});

				if (!quotation) {
					return c.json({ error: "Quotation not found" }, 404);
				}

				return c.json(quotation);
			} catch (error) {
				return c.json(
					{
						error: "Failed to fetch quotation",
						details: error,
					},
					500,
				);
			}
		},
	)
	// CREATE a new quotation
	.post(
		"/",
		authMiddleware,
		validator("json", createQuotationSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Create quotation",
			description: "Create a new sales quotation",
			responses: {
				201: {
					description: "Quotation created successfully",
				},
				400: {
					description: "Invalid input data",
				},
			},
		}),
		async (c) => {
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			try {
				// If customerId is provided, check if the customer exists
				if (data.customerId) {
					const customer = await db.customer.findUnique({
						where: { id: data.customerId },
					});
					if (!customer) {
						return c.json({ error: "Customer not found" }, 404);
					}
				}

				// If bookingId is provided, check if the booking exists
				if (data.bookingId) {
					const booking = await db.booking.findUnique({
						where: { id: data.bookingId },
					});
					if (!booking) {
						return c.json({ error: "Booking not found" }, 404);
					}
				}

				// Validate products exist and get their details
				const productIds = data.items.map((item) => item.productId);
				const products = await db.product.findMany({
					where: { id: { in: productIds } },
				});

				if (products.length !== productIds.length) {
					const foundIds = products.map((p) => p.id);
					const missingIds = productIds.filter(
						(id) => !foundIds.includes(id),
					);
					return c.json(
						{
							error: "Some products were not found",
							missingProductIds: missingIds,
						},
						400,
					);
				}

				// Generate quotation number
				const currentYear = new Date().getFullYear();
				const quotationCount = await db.quotation.count({
					where: {
						organizationId: data.organizationId,
						createdAt: {
							gte: new Date(`${currentYear}-01-01`),
							lt: new Date(`${currentYear + 1}-01-01`),
						},
					},
				});

				const quotationNumber = `Q-${currentYear}-${(quotationCount + 1).toString().padStart(4, "0")}`;

				// Calculate totals
				let subtotal = 0;
				const itemsWithTotal = data.items.map((item) => {
					const itemSubtotal = item.quantity * item.unitPrice;
					const itemDiscount =
						(itemSubtotal * (item.discount || 0)) / 100;
					const itemTotal = itemSubtotal - itemDiscount;

					subtotal += itemTotal;

					return {
						...item,
						total: itemTotal,
					};
				});

				const discountAmount = (subtotal * (data.discount || 0)) / 100;
				const afterDiscount = subtotal - discountAmount;
				const taxAmount = (afterDiscount * (data.tax || 0)) / 100;
				const totalAmount = afterDiscount + taxAmount;

				// Create the quotation
				const quotation = await db.quotation.create({
					data: {
						organizationId: data.organizationId,
						quotationNumber,

						// Customer information
						customerId: data.customerId,
						customerName: data.customerName,
						customerEmail: data.customerEmail,
						customerPhone: data.customerPhone,
						customerAddress: data.customerAddress,

						// Booking reference
						bookingId: data.bookingId,

						// Financial details
						subtotal,
						discount: data.discount || 0,
						discountAmount,
						tax: data.tax || 0,
						taxAmount,
						totalAmount,

						// Dates and status
						validUntil: data.validUntil,
						status: "DRAFT",

						// Additional info
						notes: data.notes,
						termsAndConditions: data.termsAndConditions,

						// Created by
						createdById: userId,

						// Items
						items: {
							create: data.items.map((item) => ({
								productId: item.productId,
								quantity: item.quantity,
								unitPrice: item.unitPrice,
								discount: item.discount || 0,
								tax: item.tax || 0,
								description: item.description,
								total:
									item.quantity *
									item.unitPrice *
									(1 - (item.discount || 0) / 100),
							})),
						},
					},
					include: {
						items: {
							include: {
								product: {
									select: {
										name: true,
										sku: true,
									},
								},
							},
						},
					},
				});

				return c.json(quotation, 201);
			} catch (error) {
				return c.json(
					{
						error: "Failed to create quotation",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE a quotation
	.put(
		"/:id",
		authMiddleware,
		validator("json", updateQuotationSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Update quotation",
			description: "Update details of an existing quotation",
			responses: {
				200: {
					description: "Quotation updated successfully",
				},
				400: {
					description: "Invalid update data",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");
			const data = c.req.valid("json");

			// Check if quotation exists
			const existingQuotation = await db.quotation.findUnique({
				where: { id: quotationId },
				include: {
					items: true,
				},
			});

			if (!existingQuotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// Don't allow updates to accepted, rejected, or converted quotations
			if (
				["ACCEPTED", "REJECTED", "CONVERTED"].includes(
					existingQuotation.status,
				)
			) {
				return c.json(
					{
						error: `Cannot update a quotation with status '${existingQuotation.status}'`,
					},
					400,
				);
			}

			try {
				// If customerId is changing, check if new customer exists
				if (
					data.customerId &&
					data.customerId !== existingQuotation.customerId
				) {
					const customer = await db.customer.findUnique({
						where: { id: data.customerId },
					});
					if (!customer) {
						return c.json({ error: "Customer not found" }, 404);
					}
				}

				// If items are provided, validate products exist
				if (data.items && data.items.length > 0) {
					const productIds = data.items.map((item) => item.productId);
					const products = await db.product.findMany({
						where: { id: { in: productIds } },
					});

					if (products.length !== productIds.length) {
						const foundIds = products.map((p) => p.id);
						const missingIds = productIds.filter(
							(id) => !foundIds.includes(id),
						);
						return c.json(
							{
								error: "Some products were not found",
								missingProductIds: missingIds,
							},
							400,
						);
					}
				}

				// Recalculate totals if items or discount/tax changed
				let subtotal = existingQuotation.subtotal;
				let itemsUpdate;

				if (data.items) {
					// Delete existing items and create new ones
					itemsUpdate = {
						deleteMany: {},
						create: data.items.map((item) => {
							const itemSubtotal = item.quantity * item.unitPrice;
							const itemDiscount =
								(itemSubtotal * (item.discount || 0)) / 100;
							const itemTotal = itemSubtotal - itemDiscount;

							return {
								productId: item.productId,
								quantity: item.quantity,
								unitPrice: item.unitPrice,
								discount: item.discount || 0,
								tax: item.tax || 0,
								description: item.description,
								total: itemTotal,
							};
						}),
					};

					// Recalculate subtotal
					subtotal = data.items.reduce((sum, item) => {
						const itemSubtotal = item.quantity * item.unitPrice;
						const itemDiscount =
							(itemSubtotal * (item.discount || 0)) / 100;
						return sum + (itemSubtotal - itemDiscount);
					}, 0);
				}

				// Calculate discount and tax
				const discount =
					data.discount !== undefined
						? data.discount
						: existingQuotation.discount;
				const discountAmount = (subtotal * discount) / 100;
				const afterDiscount = subtotal - discountAmount;

				const tax =
					data.tax !== undefined ? data.tax : existingQuotation.tax;
				const taxAmount = (afterDiscount * tax) / 100;

				const totalAmount = afterDiscount + taxAmount;

				// Update the quotation
				const updatedQuotation = await db.quotation.update({
					where: { id: quotationId },
					data: {
						...(data.customerId && { customerId: data.customerId }),
						...(data.customerName && {
							customerName: data.customerName,
						}),
						...(data.customerEmail && {
							customerEmail: data.customerEmail,
						}),
						...(data.customerPhone && {
							customerPhone: data.customerPhone,
						}),
						...(data.customerAddress && {
							customerAddress: data.customerAddress,
						}),
						...(data.validUntil && { validUntil: data.validUntil }),
						...(data.notes && { notes: data.notes }),
						...(data.termsAndConditions && {
							termsAndConditions: data.termsAndConditions,
						}),
						...(data.status && { status: data.status }),

						// Update financial details if items or discount/tax changed
						...(data.items && { subtotal }),
						...(data.discount !== undefined && { discount }),
						...(data.discount !== undefined && { discountAmount }),
						...(data.tax !== undefined && { tax }),
						...(data.tax !== undefined && { taxAmount }),
						...((data.items ||
							data.discount !== undefined ||
							data.tax !== undefined) && { totalAmount }),

						// Update items if provided
						...(data.items && { items: itemsUpdate }),
					},
					include: {
						items: {
							include: {
								product: {
									select: {
										name: true,
										sku: true,
									},
								},
							},
						},
					},
				});

				return c.json(updatedQuotation);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update quotation",
						details: error,
					},
					400,
				);
			}
		},
	)
	// DELETE a quotation
	.delete(
		"/:id",
		authMiddleware,
		describeRoute({
			tags: ["Quotation"],
			summary: "Delete quotation",
			description: "Delete a quotation that is in DRAFT status",
			responses: {
				200: {
					description: "Quotation deleted successfully",
				},
				400: {
					description: "Cannot delete quotation with wrong status",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");

			// Check if quotation exists
			const quotation = await db.quotation.findUnique({
				where: { id: quotationId },
				include: {
					sale: true,
				},
			});

			if (!quotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// Only allow deletion of DRAFT quotations
			if (quotation.status !== "DRAFT") {
				return c.json(
					{
						error: `Cannot delete a quotation with status '${quotation.status}'`,
					},
					400,
				);
			}

			// Check if quotation has associated sales
			if (quotation.sale) {
				return c.json(
					{
						error: "Cannot delete a quotation that has been converted to a sale",
					},
					400,
				);
			}

			try {
				// Delete the quotation and its items
				await db.quotation.delete({
					where: { id: quotationId },
				});

				return c.json({ success: true });
			} catch (error) {
				return c.json(
					{
						error: "Failed to delete quotation",
						details: error,
					},
					400,
				);
			}
		},
	)
	// UPDATE quotation status
	.post(
		"/:id/status",
		authMiddleware,
		validator("json", updateStatusSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Update quotation status",
			description:
				"Update the status of a quotation (send, accept, reject, etc.)",
			responses: {
				200: {
					description: "Quotation status updated successfully",
				},
				400: {
					description: "Invalid status update",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");
			const { status, notes, rejectionReason } = c.req.valid("json");

			// Check if quotation exists
			const quotation = await db.quotation.findUnique({
				where: { id: quotationId },
			});

			if (!quotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// Validate status transitions
			const validTransitions = {
				DRAFT: ["SENT"],
				SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
				ACCEPTED: ["CONVERTED"],
				REJECTED: [], // Terminal state
				EXPIRED: ["SENT"], // Can resend an expired quotation
				CONVERTED: [], // Terminal state
			};

			if (!validTransitions[quotation.status].includes(status)) {
				return c.json(
					{
						error: `Cannot change quotation status from '${quotation.status}' to '${status}'`,
					},
					400,
				);
			}

			// Special validation for rejection
			if (status === "REJECTED" && !rejectionReason) {
				return c.json(
					{
						error: "Rejection reason is required when rejecting a quotation",
					},
					400,
				);
			}

			try {
				// Update the quotation status
				const updatedQuotation = await db.quotation.update({
					where: { id: quotationId },
					data: {
						status,
						...(notes && {
							notes: quotation.notes
								? `${quotation.notes}\n${notes}`
								: notes,
						}),
						...(rejectionReason && { rejectionReason }),
					},
				});

				return c.json(updatedQuotation);
			} catch (error) {
				return c.json(
					{
						error: "Failed to update quotation status",
						details: error,
					},
					400,
				);
			}
		},
	)
	// CONVERT quotation to order/sale
	.post(
		"/:id/convert",
		authMiddleware,
		validator("json", convertToOrderSchema),
		describeRoute({
			tags: ["Quotation"],
			summary: "Convert to sale",
			description: "Convert an accepted quotation to a sale/order",
			responses: {
				200: {
					description: "Quotation converted successfully",
				},
				400: {
					description: "Cannot convert quotation",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");
			const data = c.req.valid("json");
			const { userId } = c.req.auth;

			// Check if quotation exists
			const quotation = await db.quotation.findUnique({
				where: { id: quotationId },
				include: {
					items: true,
				},
			});

			if (!quotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// Only allow conversion of ACCEPTED quotations
			if (quotation.status !== "ACCEPTED") {
				return c.json(
					{
						error: `Cannot convert a quotation with status '${quotation.status}'. Quotation must be ACCEPTED.`,
					},
					400,
				);
			}

			// Check if quotation is already converted
			const existingSale = await db.sale.findFirst({
				where: { quotationId },
			});

			if (existingSale) {
				return c.json(
					{
						error: "Quotation has already been converted to sale",
						sale: existingSale,
					},
					400,
				);
			}

			try {
				// Generate sale number
				const currentYear = new Date().getFullYear();
				const saleCount = await db.sale.count({
					where: {
						organizationId: quotation.organizationId,
						createdAt: {
							gte: new Date(`${currentYear}-01-01`),
							lt: new Date(`${currentYear + 1}-01-01`),
						},
					},
				});

				const saleNumber = `S-${currentYear}-${(saleCount + 1).toString().padStart(4, "0")}`;

				// Create the sale
				const sale = await db.sale.create({
					data: {
						organizationId: quotation.organizationId,
						saleNumber,

						// Customer information
						customerId: quotation.customerId,
						customerName: quotation.customerName,
						customerEmail: quotation.customerEmail,
						customerPhone: quotation.customerPhone,
						customerAddress: quotation.customerAddress,

						// Reference to quotation and booking
						quotationId: quotation.id,
						bookingId: quotation.bookingId,

						// Financial details
						subtotal: quotation.subtotal,
						discount: quotation.discount,
						discountAmount: quotation.discountAmount,
						tax: quotation.tax,
						taxAmount: quotation.taxAmount,
						totalAmount: quotation.totalAmount,

						// Payment details
						paymentMethod: data.paymentMethod,
						paymentTerms: data.paymentTerms,
						depositAmount: data.depositAmount,

						// Status and notes
						status: "PENDING",
						notes: data.notes || quotation.notes,
						termsAndConditions: quotation.termsAndConditions,

						// Metadata
						createdById: userId,

						// Items
						items: {
							create: quotation.items.map((item) => ({
								productId: item.productId,
								quantity: item.quantity,
								unitPrice: item.unitPrice,
								discount: item.discount,
								tax: item.tax,
								description: item.description,
								total: item.total,
							})),
						},
					},
					include: {
						items: true,
					},
				});

				// Update quotation status to CONVERTED
				await db.quotation.update({
					where: { id: quotationId },
					data: {
						status: "CONVERTED",
						saleId: sale.id,
					},
				});

				// Process deposit payment if requested
				if (
					data.requestDeposit &&
					data.depositAmount &&
					data.depositAmount > 0
				) {
					const deposit = await db.payment.create({
						data: {
							organizationId: quotation.organizationId,
							saleId: sale.id,
							customerId: quotation.customerId,
							amount: data.depositAmount,
							paymentMethod: data.paymentMethod || "UNKNOWN",
							status: data.requestPayment ? "PENDING" : "DRAFT",
							type: "DEPOSIT",
							description: `Deposit payment for sale ${saleNumber}`,
							createdById: userId,
						},
					});

					return c.json({
						sale,
						deposit,
						message: "Quotation converted to sale with deposit",
					});
				}

				return c.json({
					sale,
					message: "Quotation successfully converted to sale",
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to convert quotation to sale",
						details: error,
					},
					400,
				);
			}
		},
	)
	// GET quotation PDF
	.get(
		"/:id/pdf",
		authMiddleware,
		describeRoute({
			tags: ["Quotation"],
			summary: "Generate PDF",
			description: "Generate a PDF version of the quotation",
			responses: {
				200: {
					description: "PDF generation requested",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");

			// Check if quotation exists
			const quotation = await db.quotation.findUnique({
				where: { id: quotationId },
				include: {
					organization: {
						select: {
							name: true,
							address: true,
							email: true,
							phone: true,
							logo: true,
						},
					},
					customer: {
						select: {
							name: true,
							email: true,
							contact: true,
							address: true,
						},
					},
					items: {
						include: {
							product: {
								select: {
									name: true,
									sku: true,
									description: true,
								},
							},
						},
					},
				},
			});

			if (!quotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// In a real implementation, this would generate a PDF
			// For now, we'll return the data needed for PDF generation
			return c.json({
				success: true,
				message: "PDF generation requested (implementation pending)",
				data: {
					quotation,
					pdfUrl: `/api/download/quotation/${quotationId}`,
				},
			});
		},
	)
	// SEND quotation email
	.post(
		"/:id/send",
		authMiddleware,
		validator(
			"json",
			z.object({
				recipientEmail: z.string().email().optional(),
				message: z.string().optional(),
				includeTerms: z.boolean().optional().default(true),
			}),
		),
		describeRoute({
			tags: ["Quotation"],
			summary: "Send quotation",
			description: "Send quotation to customer via email",
			responses: {
				200: {
					description: "Quotation sent successfully",
				},
				400: {
					description: "Cannot send quotation",
				},
				404: {
					description: "Quotation not found",
				},
			},
		}),
		async (c) => {
			const quotationId = c.req.param("id");
			const { recipientEmail, message, includeTerms } =
				c.req.valid("json");

			// Check if quotation exists
			const quotation = await db.quotation.findUnique({
				where: { id: quotationId },
			});

			if (!quotation) {
				return c.json({ error: "Quotation not found" }, 404);
			}

			// Only allow sending DRAFT or EXPIRED quotations
			if (!["DRAFT", "EXPIRED"].includes(quotation.status)) {
				return c.json(
					{
						error: `Cannot send a quotation with status '${quotation.status}'`,
					},
					400,
				);
			}

			// Determine recipient email
			const toEmail = recipientEmail || quotation.customerEmail;
			if (!toEmail) {
				return c.json(
					{
						error: "Recipient email is required but not provided or available in quotation",
					},
					400,
				);
			}

			try {
				// In a real implementation, this would send an email
				// For now, we'll update the status and return success

				// Update quotation status to SENT
				const updatedQuotation = await db.quotation.update({
					where: { id: quotationId },
					data: {
						status: "SENT",
						lastSentAt: new Date(),
					},
				});

				return c.json({
					success: true,
					message: `Quotation sent to ${toEmail} (implementation pending)`,
					quotation: updatedQuotation,
				});
			} catch (error) {
				return c.json(
					{
						error: "Failed to send quotation",
						details: error,
					},
					400,
				);
			}
		},
	);
