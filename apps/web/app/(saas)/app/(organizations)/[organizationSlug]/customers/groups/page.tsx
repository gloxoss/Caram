"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationCustomerGroupsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [customerGroups, setCustomerGroups] = useState([]);

	useEffect(() => {
		const fetchCustomerGroups = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/customer-groups?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch customer groups");
				}
				const data = await response.json();
				setCustomerGroups(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch customer groups");
			}
		};

		fetchCustomerGroups();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Customer Groups" />

			<Card>
				<div className="p-4">
					{customerGroups.length > 0 ? (
						<ul>
							{customerGroups.map((customerGroup: any) => (
								<li key={customerGroup.id}>Customer Group ID: {customerGroup.id}</li>
							))}
						</ul>
					) : (
						<p>No customer groups found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
