"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationProductSalesReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [productSalesData, setProductSalesData] = useState([]);

	useEffect(() => {
		const fetchProductSalesData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/product-sale?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch product sales data");
				}
				const data = await response.json();
				setProductSalesData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch product sales data");
			}
		};

		fetchProductSalesData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Product Sales Report" />

			<Card>
				<div className="p-4">
					{productSalesData.length > 0 ? (
						<ul>
							{productSalesData.map((item: any) => (
								<li key={item.id}>Product Sales ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No product sales data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
