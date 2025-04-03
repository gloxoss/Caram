"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationPurchaseReturnReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [purchaseReturnData, setPurchaseReturnData] = useState([]);

	useEffect(() => {
		const fetchPurchaseReturnData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/purchase-return?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch purchase return data");
				}
				const data = await response.json();
				setPurchaseReturnData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch purchase return data");
			}
		};

		fetchPurchaseReturnData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Purchase Return Report" />

			<Card>
				<div className="p-4">
					{purchaseReturnData.length > 0 ? (
						<ul>
							{purchaseReturnData.map((item: any) => (
								<li key={item.id}>Purchase Return ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No purchase return data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
