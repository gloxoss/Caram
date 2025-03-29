"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationAddExpensePage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState({
		amount: "",
		categoryId: "",
		description: "",
	});

	const handleInputChange = (e: any) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		try {
			const response = await fetch(`/api/expenses`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});
			if (!response.ok) {
				throw new Error("Failed to create expense");
			}
			toast.success("Expense created successfully");
			router.push(`/app/${organizationSlug}/expenses`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create expense");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Organization Expense" />

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
							type="text"
							name="categoryId"
							placeholder="Category ID"
							onChange={handleInputChange}
						/>
						<Input
							type="text"
							name="description"
							placeholder="Description"
							onChange={handleInputChange}
						/>
						<Button type="submit">Create Expense</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
