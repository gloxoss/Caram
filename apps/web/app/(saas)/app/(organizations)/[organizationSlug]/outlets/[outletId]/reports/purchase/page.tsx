"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletPurchaseReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [purchaseData, setPurchaseData] = useState([]);

	useEffect(() => {
		const fetchPurchaseData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/purchase?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch purchase data");
				}
				const data = await response.json();
				setPurchaseData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch purchase data");
			}
		};

		fetchPurchaseData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Purchase Report" />

			<Card>
				<div className="p-4">
					{purchaseData.length > 0 ? (
						<ul>
							{purchaseData.map((item: any) => (
								<li key={item.id}>Purchase ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No purchase data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
