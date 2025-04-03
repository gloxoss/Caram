"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletSalesReturnReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [salesReturnData, setSalesReturnData] = useState([]);

	useEffect(() => {
		const fetchSalesReturnData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/sales-return?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch sales return data");
				}
				const data = await response.json();
				setSalesReturnData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch sales return data");
			}
		};

		fetchSalesReturnData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Sales Return Report" />

			<Card>
				<div className="p-4">
					{salesReturnData.length > 0 ? (
						<ul>
							{salesReturnData.map((item: any) => (
								<li key={item.id}>Sales Return ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No sales return data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
