"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletQuotationsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [quotations, setQuotations] = useState([]);

	useEffect(() => {
		const fetchQuotations = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/quotations?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch quotations");
				}
				const data = await response.json();
				setQuotations(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch quotations");
			}
		};

		fetchQuotations();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Quotations" />

			<Card>
				<div className="p-4">
					{quotations.length > 0 ? (
						<ul>
							{quotations.map((quotation: any) => (
								<li key={quotation.id}>Quotation ID: {quotation.id}</li>
							))}
						</ul>
					) : (
						<p>No quotations found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}