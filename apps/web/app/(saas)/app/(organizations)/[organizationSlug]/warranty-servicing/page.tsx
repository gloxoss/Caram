"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationWarrantyServicingPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [warrantyServicings, setWarrantyServicings] = useState([]);

	useEffect(() => {
		const fetchWarrantyServicings = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/warranty-servicings?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch warranty servicings");
				}
				const data = await response.json();
				setWarrantyServicings(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch warranty servicings");
			}
		};

		fetchWarrantyServicings();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Warranty Servicings" />

			<Card>
				<div className="p-4">
					{warrantyServicings.length > 0 ? (
						<ul>
							{warrantyServicings.map((warrantyServicing: any) => (
								<li key={warrantyServicing.id}>Warranty Servicing ID: {warrantyServicing.id}</li>
							))}
						</ul>
					) : (
						<p>No warranty servicings found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}