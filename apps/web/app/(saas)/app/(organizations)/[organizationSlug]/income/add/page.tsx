"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationAddIncomePage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState({
		amount: "",
		itemId: "",
		description: "",
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		try {
			const response = await fetch(`/api/income`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});
			if (!response.ok) {
				throw new Error("Failed to create income");
			}
			toast.success("Income created successfully");
			router.push(`/app/${organizationSlug}/income`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create income");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Organization Income" />

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
							name="itemId"
							placeholder="Item ID"
							onChange={handleInputChange}
						/>
						<Input
							type="text"
							name="description"
							placeholder="Description"
							onChange={handleInputChange}
						/>
						<Button type="submit">Create Income</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
