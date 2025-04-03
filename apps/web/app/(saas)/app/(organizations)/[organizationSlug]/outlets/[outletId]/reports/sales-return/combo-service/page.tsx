"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletComboServiceReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [comboServiceData, setComboServiceData] = useState([]);

	useEffect(() => {
		const fetchComboServiceData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/sales-return/combo-service?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch combo service data");
				}
				const data = await response.json();
				setComboServiceData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch combo service data");
			}
		};

		fetchComboServiceData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Combo Service Report" />

			<Card>
				<div className="p-4">
					{comboServiceData.length > 0 ? (
						<ul>
							{comboServiceData.map((item: any) => (
								<li key={item.id}>Combo Service ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No combo service data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
