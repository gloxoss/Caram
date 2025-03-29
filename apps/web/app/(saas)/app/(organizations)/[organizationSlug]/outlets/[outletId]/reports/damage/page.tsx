"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletDamageReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [damageData, setDamageData] = useState([]);

	useEffect(() => {
		const fetchDamageData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/damage?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch damage data");
				}
				const data = await response.json();
				setDamageData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch damage data");
			}
		};

		fetchDamageData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Damage Report" />

			<Card>
				<div className="p-4">
					{damageData.length > 0 ? (
						<ul>
							{damageData.map((item: any) => (
								<li key={item.id}>Damage ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No damage data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}