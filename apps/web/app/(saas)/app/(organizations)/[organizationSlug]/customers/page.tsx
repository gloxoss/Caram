"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationCustomersPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [customers, setCustomers] = useState([]);

	useEffect(() => {
		const fetchCustomers = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/customers?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch customers");
				}
				const data = await response.json();
				setCustomers(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch customers");
			}
		};

		fetchCustomers();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Customers" />

			<Card>
				<div className="p-4">
					{customers.length > 0 ? (
						<ul>
							{customers.map((customer: any) => (
								<li key={customer.id}>Customer ID: {customer.id}</li>
							))}
						</ul>
					) : (
						<p>No customers found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}