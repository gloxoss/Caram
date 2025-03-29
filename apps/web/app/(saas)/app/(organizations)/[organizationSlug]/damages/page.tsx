"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationDamagesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [damages, setDamages] = useState([]);

	useEffect(() => {
		const fetchDamages = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/damages?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch damages");
				}
				const data = await response.json();
				setDamages(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch damages");
			}
		};

		fetchDamages();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Damages" />

			<Card>
				<div className="p-4">
					{damages.length > 0 ? (
						<ul>
							{damages.map((damage: any) => (
								<li key={damage.id}>Damage ID: {damage.id}</li>
							))}
						</ul>
					) : (
						<p>No damages found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
