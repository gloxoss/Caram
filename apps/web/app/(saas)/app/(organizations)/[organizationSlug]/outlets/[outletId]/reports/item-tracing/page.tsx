"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletItemTracingReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [itemTracingData, setItemTracingData] = useState([]);

	useEffect(() => {
		const fetchItemTracingData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/item-tracing?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch item tracing data");
				}
				const data = await response.json();
				setItemTracingData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch item tracing data");
			}
		};

		fetchItemTracingData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Item Tracing Report" />

			<Card>
				<div className="p-4">
					{itemTracingData.length > 0 ? (
						<ul>
							{itemTracingData.map((item: any) => (
								<li key={item.id}>Item Tracing ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No item tracing data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
