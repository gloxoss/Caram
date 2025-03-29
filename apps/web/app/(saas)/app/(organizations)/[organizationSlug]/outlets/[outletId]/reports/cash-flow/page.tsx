"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletCashFlowReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [cashFlowData, setCashFlowData] = useState([]);

	useEffect(() => {
		const fetchCashFlowData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/cash-flow?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch cash flow data");
				}
				const data = await response.json();
				setCashFlowData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch cash flow data");
			}
		};

		fetchCashFlowData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Cash Flow Report" />

			<Card>
				<div className="p-4">
					{cashFlowData.length > 0 ? (
						<ul>
							{cashFlowData.map((item: any) => (
								<li key={item.id}>Cash Flow ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No cash flow data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}