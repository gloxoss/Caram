"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationDueSalesReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [dueSalesData, setDueSalesData] = useState([]);

	useEffect(() => {
		const fetchDueSalesData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/due-sales?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch due sales data");
				}
				const data = await response.json();
				setDueSalesData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch due sales data");
			}
		};

		fetchDueSalesData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Due Sales Report" />

			<Card>
				<div className="p-4">
					{dueSalesData.length > 0 ? (
						<ul>
							{dueSalesData.map((item: any) => (
								<li key={item.id}>Due Sales ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No due sales data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
