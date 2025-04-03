"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationItemTracingReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [itemTracingData, setItemTracingData] = useState([]);

	useEffect(() => {
		const fetchItemTracingData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/item-tracing?organizationId=${organizationId}`,
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
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Item Tracing Report" />

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
