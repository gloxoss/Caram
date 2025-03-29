"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationDeliveryPartnersPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [deliveryPartners, setDeliveryPartners] = useState([]);

	useEffect(() => {
		const fetchDeliveryPartners = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/delivery-partners?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch delivery partners");
				}
				const data = await response.json();
				setDeliveryPartners(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch delivery partners");
			}
		};

		fetchDeliveryPartners();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Delivery Partners" />

			<Card>
				<div className="p-4">
					{deliveryPartners.length > 0 ? (
						<ul>
							{deliveryPartners.map((deliveryPartner: any) => (
								<li key={deliveryPartner.id}>Delivery Partner ID: {deliveryPartner.id}</li>
							))}
						</ul>
					) : (
						<p>No delivery partners found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
