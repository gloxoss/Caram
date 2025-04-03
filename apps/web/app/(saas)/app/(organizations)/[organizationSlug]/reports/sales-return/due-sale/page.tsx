"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationDueSaleReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [dueSaleData, setDueSaleData] = useState([]);

	useEffect(() => {
		const fetchDueSaleData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/sales-return/due-sale?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch due sale data");
				}
				const data = await response.json();
				setDueSaleData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch due sale data");
			}
		};

		fetchDueSaleData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Due Sale Report" />

			<Card>
				<div className="p-4">
					{dueSaleData.length > 0 ? (
						<ul>
							{dueSaleData.map((item: any) => (
								<li key={item.id}>Due Sale ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No due sale data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
