"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationServicingReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [servicingData, setServicingData] = useState([]);

	useEffect(() => {
		const fetchServicingData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/servicing?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch servicing data");
				}
				const data = await response.json();
				setServicingData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch servicing data");
			}
		};

		fetchServicingData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Servicing Report" />

			<Card>
				<div className="p-4">
					{servicingData.length > 0 ? (
						<ul>
							{servicingData.map((item: any) => (
								<li key={item.id}>Servicing ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No servicing data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
