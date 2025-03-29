"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationPurchaseReturnsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [purchaseReturns, setPurchaseReturns] = useState([]);

	useEffect(() => {
		const fetchPurchaseReturns = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/purchase-returns?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch purchase returns");
				}
				const data = await response.json();
				setPurchaseReturns(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch purchase returns");
			}
		};

		fetchPurchaseReturns();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Purchase Returns" />

			<Card>
				<div className="p-4">
					{purchaseReturns.length > 0 ? (
						<ul>
							{purchaseReturns.map((purchaseReturn: any) => (
								<li key={purchaseReturn.id}>Purchase Return ID: {purchaseReturn.id}</li>
							))}
						</ul>
					) : (
						<p>No purchase returns found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
