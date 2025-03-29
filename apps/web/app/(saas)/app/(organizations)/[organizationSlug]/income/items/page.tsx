"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationIncomeItemsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [incomeItems, setIncomeItems] = useState([]);

	useEffect(() => {
		const fetchIncomeItems = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/income-items?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch income items");
				}
				const data = await response.json();
				setIncomeItems(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch income items");
			}
		};

		fetchIncomeItems();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Income Items" />

			<Card>
				<div className="p-4">
					{incomeItems.length > 0 ? (
						<ul>
							{incomeItems.map((incomeItem: any) => (
								<li key={incomeItem.id}>Income Item ID: {incomeItem.id}</li>
							))}
						</ul>
					) : (
						<p>No income items found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
