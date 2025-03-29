"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletPurchasesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [purchases, setPurchases] = useState([]);

	useEffect(() => {
		const fetchPurchases = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/purchases?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch purchases");
				}
				const data = await response.json();
				setPurchases(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch purchases");
			}
		};

		fetchPurchases();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Purchases" />

			<Card>
				<div className="p-4">
					{purchases.length > 0 ? (
						<ul>
							{purchases.map((purchase: any) => (
								<li key={purchase.id}>Purchase ID: {purchase.id}</li>
							))}
						</ul>
					) : (
						<p>No purchases found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}