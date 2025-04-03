"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationProductProfitReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [productProfitData, setProductProfitData] = useState([]);

	useEffect(() => {
		const fetchProductProfitData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/product-profit?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch product profit data");
				}
				const data = await response.json();
				setProductProfitData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch product profit data");
			}
		};

		fetchProductProfitData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Product Profit Report" />

			<Card>
				<div className="p-4">
					{productProfitData.length > 0 ? (
						<ul>
							{productProfitData.map((item: any) => (
								<li key={item.id}>Product Profit ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No product profit data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
