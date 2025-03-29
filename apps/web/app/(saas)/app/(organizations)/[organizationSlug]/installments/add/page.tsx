"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationAddInstallmentPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState({
		amount: "",
		dueDate: "",
		customerId: "",
	});

	const handleInputChange = (e: any) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		try {
			const response = await fetch(`/api/installments`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});
			if (!response.ok) {
				throw new Error("Failed to create installment");
			}
			toast.success("Installment created successfully");
			router.push(`/app/${organizationSlug}/installments`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create installment");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Organization Installment" />

			<Card>
				<div className="p-4">
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Input
							type="number"
							name="amount"
							placeholder="Amount"
							onChange={handleInputChange}
						/>
						<Input
							type="date"
							name="dueDate"
							placeholder="Due Date"
							onChange={handleInputChange}
						/>
						<Input
							type="text"
							name="customerId"
							placeholder="Customer ID"
							onChange={handleInputChange}
						/>
						<Button type="submit">Create Installment</Button>
					</form>
				</div>
			</Card>
		</div>
	)};
