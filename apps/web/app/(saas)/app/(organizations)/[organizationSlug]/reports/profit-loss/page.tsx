"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationProfitLossReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [profitLossData, setProfitLossData] = useState([]);

	useEffect(() => {
		const fetchProfitLossData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/profit-loss?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch profit loss data");
				}
				const data = await response.json();
				setProfitLossData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch profit loss data");
			}
		};

		fetchProfitLossData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Profit Loss Report" />

			<Card>
				<div className="p-4">
					{profitLossData.length > 0 ? (
						<ul>
							{profitLossData.map((item: any) => (
								<li key={item.id}>Profit Loss ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No profit loss data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
