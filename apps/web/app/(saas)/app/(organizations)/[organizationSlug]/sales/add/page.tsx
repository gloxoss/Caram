"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SaleItem {
	productId: string;
	quantity: number;
	unitPrice: number;
	discountAmount: number;
}

interface FormData {
	outletId: string;
	customerId: string;
	items: SaleItem[];
	discountAmount: number;
	taxRate: number;
	paymentMethod: "CASH" | "CARD" | "MOBILE_PAYMENT" | "OTHER";
	status: "DRAFT" | "COMPLETED" | "VOIDED";
	notes: string;
}

export default function AddSalesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState<FormData>({
		outletId: "",
		customerId: "",
		items: [
			{ productId: "", quantity: 1, unitPrice: 0, discountAmount: 0 },
		],
		discountAmount: 0,
		taxRate: 0,
		paymentMethod: "CASH",
		status: "COMPLETED",
		notes: "",
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target as any;
		setFormData((prevState) => ({
			...prevState,
			[name as keyof FormData]: value as any,
		}));
	};

	const handleItemChange = (
		index: number,
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const { name, value } = e.target;
		const items = [...formData.items];
		items[index] = { ...items[index], [name]: value };
		setFormData({ ...formData, items });
	};

	const addItem = () => {
		setFormData({
			...formData,
			items: [
				...formData.items,
				{ productId: "", quantity: 1, unitPrice: 0, discountAmount: 0 },
			],
		});
	};

	const removeItem = (index: number) => {
		const items = [...formData.items];
		items.splice(index, 1);
		setFormData({ ...formData, items });
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch("/api/sales", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});

			if (!response.ok) {
				throw new Error("Failed to create sale");
			}

			toast.success("Sale created successfully");
			router.push(`/app/${organizationSlug}/sales`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create sale");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Sale" />

			<Card>
				<div className="p-4">
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4"
					>
						<div>
							<label
								htmlFor="outletId"
								className="block text-sm font-medium text-gray-700"
							>
								Outlet
							</label>
							<Input
								type="text"
								id="outletId"
								name="outletId"
								value={formData.outletId}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div>
							<label
								htmlFor="customerId"
								className="block text-sm font-medium text-gray-700"
							>
								Customer ID
							</label>
							<Input
								type="text"
								id="customerId"
								name="customerId"
								value={formData.customerId}
								onChange={handleInputChange}
							/>
						</div>

						<div>
							<label
								htmlFor="productId-0"
								className="block text-sm font-medium text-gray-700"
							>
								Items
							</label>
							{formData.items.map((item, index) => (
								<div key={index} className="flex gap-2 mb-2">
									<Input
										type="text"
										id={`productId-${index}`}
										name="productId"
										placeholder="Product ID"
										value={item.productId}
										onChange={(e) =>
											handleItemChange(index, e)
										}
										required
									/>
									<Input
										type="number"
										id={`quantity-${index}`}
										name="quantity"
										placeholder="Quantity"
										value={item.quantity}
										onChange={(e) =>
											handleItemChange(index, e)
										}
										required
									/>
									<Input
										type="number"
										id={`unitPrice-${index}`}
										name="unitPrice"
										placeholder="Unit Price"
										value={item.unitPrice}
										onChange={(e) =>
											handleItemChange(index, e)
										}
										required
									/>
									<Input
										type="number"
										id={`discountAmount-${index}`}
										name="discountAmount"
										placeholder="Discount"
										value={item.discountAmount}
										onChange={(e) =>
											handleItemChange(index, e)
										}
									/>
									<Button
										type="button"
										variant="error"
										onClick={() => removeItem(index)}
									>
										Remove
									</Button>
								</div>
							))}
							<Button type="button" onClick={addItem}>
								Add Item
							</Button>
						</div>

						<div>
							<label
								htmlFor="discountAmount"
								className="block text-sm font-medium text-gray-700"
							>
								Discount Amount
							</label>
							<Input
								type="number"
								id="discountAmount"
								name="discountAmount"
								value={formData.discountAmount}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="taxRate"
								className="block text-sm font-medium text-gray-700"
							>
								Tax Rate
							</label>
							<Input
								type="number"
								id="taxRate"
								name="taxRate"
								value={formData.taxRate}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="paymentMethod"
								className="block text-sm font-medium text-gray-700"
							>
								Payment Method
							</label>
							<select
								id="paymentMethod"
								name="paymentMethod"
								value={formData.paymentMethod}
								onChange={handleInputChange}
								className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
							>
								<option value="CASH">Cash</option>
								<option value="CARD">Card</option>
								<option value="MOBILE_PAYMENT">
									Mobile Payment
								</option>
								<option value="OTHER">Other</option>
							</select>
						</div>
						<div>
							<label
								htmlFor="status"
								className="block text-sm font-medium text-gray-700"
							>
								Status
							</label>
							<select
								id="status"
								name="status"
								value={formData.status}
								onChange={handleInputChange}
								className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
							>
								<option value="DRAFT">Draft</option>
								<option value="COMPLETED">Completed</option>
								<option value="VOIDED">Voided</option>
							</select>
						</div>
						<div>
							<label
								htmlFor="notes"
								className="block text-sm font-medium text-gray-700"
							>
								Notes
							</label>
							<Input
								type="text"
								id="notes"
								name="notes"
								value={formData.notes}
								onChange={handleInputChange}
							/>
						</div>

						<Button type="submit">Add Sale</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
