"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationTransfersPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [transfers, setTransfers] = useState([]);

	useEffect(() => {
		const fetchTransfers = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/transfers?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch transfers");
				}
				const data = await response.json();
				setTransfers(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch transfers");
			}
		};

		fetchTransfers();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Transfers" />

			<Card>
				<div className="p-4">
					{transfers.length > 0 ? (
						<ul>
							{transfers.map((transfer: any) => (
								<li key={transfer.id}>Transfer ID: {transfer.id}</li>
							))}
						</ul>
					) : (
						<p>No transfers found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}