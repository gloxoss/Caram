"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationIncomePage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [income, setIncome] = useState([]);

	useEffect(() => {
		const fetchIncome = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/income?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch income");
				}
				const data = await response.json();
				setIncome(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch income");
			}
		};

		fetchIncome();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Income" />

			<Card>
				<div className="p-4">
					{income.length > 0 ? (
						<ul>
							{income.map((incomeItem: any) => (
								<li key={incomeItem.id}>Income ID: {incomeItem.id}</li>
							))}
						</ul>
					) : (
						<p>No income found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}