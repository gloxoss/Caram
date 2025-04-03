"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationServiceSalesReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [serviceSalesData, setServiceSalesData] = useState([]);

	useEffect(() => {
		const fetchServiceSalesData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/sales-return/service-sale?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch service sales data");
				}
				const data = await response.json();
				setServiceSalesData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch service sales data");
			}
		};

		fetchServiceSalesData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Service Sales Report" />

			<Card>
				<div className="p-4">
					{serviceSalesData.length > 0 ? (
						<ul>
							{serviceSalesData.map((item: any) => (
								<li key={item.id}>Service Sales ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No service sales data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
