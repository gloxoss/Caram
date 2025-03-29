"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSaleReturnsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [saleReturns, setSaleReturns] = useState([]);

	useEffect(() => {
		const fetchSaleReturns = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/sale-returns?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch sale returns");
				}
				const data = await response.json();
				setSaleReturns(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch sale returns");
			}
		};

		fetchSaleReturns();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Sale Returns" />

			<Card>
				<div className="p-4">
					{saleReturns.length > 0 ? (
						<ul>
							{saleReturns.map((saleReturn: any) => (
								<li key={saleReturn.id}>Sale Return ID: {saleReturn.id}</li>
							))}
						</ul>
					) : (
						<p>No sale returns found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}