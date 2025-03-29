"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSalesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [sales, setSales] = useState([]);

	useEffect(() => {
		const fetchSales = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/sales?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch sales");
				}
				const data = await response.json();
				setSales(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch sales");
			}
		};

		fetchSales();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Sales" />

			<Card>
				<div className="p-4">
					{sales.length > 0 ? (
						<ul>
							{sales.map((sale: any) => (
								<li key={sale.id}>Sale ID: {sale.id}</li>
							))}
						</ul>
					) : (
						<p>No sales found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
