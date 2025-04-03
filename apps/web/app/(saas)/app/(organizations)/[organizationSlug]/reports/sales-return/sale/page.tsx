"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSaleReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [saleData, setSaleData] = useState([]);

	useEffect(() => {
		const fetchSaleData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/sales-return/sale?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch sale data");
				}
				const data = await response.json();
				setSaleData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch sale data");
			}
		};

		fetchSaleData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Sale Report" />

			<Card>
				<div className="p-4">
					{saleData.length > 0 ? (
						<ul>
							{saleData.map((item: any) => (
								<li key={item.id}>Sale ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No sale data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
