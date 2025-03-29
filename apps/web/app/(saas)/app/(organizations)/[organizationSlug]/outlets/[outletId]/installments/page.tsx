"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletInstallmentsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [installments, setInstallments] = useState([]);

	useEffect(() => {
		const fetchInstallments = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/installments?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch installments");
				}
				const data = await response.json();
				setInstallments(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch installments");
			}
		};

		fetchInstallments();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Installments" />

			<Card>
				<div className="p-4">
					{installments.length > 0 ? (
						<ul>
							{installments.map((installment: any) => (
								<li key={installment.id}>Installment ID: {installment.id}</li>
							))}
						</ul>
					) : (
						<p>No installments found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}