"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSuppliersPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [suppliers, setSuppliers] = useState([]);

	useEffect(() => {
		const fetchSuppliers = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/suppliers?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch suppliers");
				}
				const data = await response.json();
				setSuppliers(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch suppliers");
			}
		};

		fetchSuppliers();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Suppliers" />

			<Card>
				<div className="p-4">
					{suppliers.length > 0 ? (
						<ul>
							{suppliers.map((supplier: any) => (
								<li key={supplier.id}>Supplier ID: {supplier.id}</li>
							))}
						</ul>
					) : (
						<p>No suppliers found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}