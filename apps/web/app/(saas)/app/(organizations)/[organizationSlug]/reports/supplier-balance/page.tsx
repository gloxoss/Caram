"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSupplierBalanceReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [supplierBalanceData, setSupplierBalanceData] = useState([]);

	useEffect(() => {
		const fetchSupplierBalanceData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/supplier-balance?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch supplier balance data");
				}
				const data = await response.json();
				setSupplierBalanceData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch supplier balance data");
			}
		};

		fetchSupplierBalanceData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Supplier Balance Report" />

			<Card>
				<div className="p-4">
					{supplierBalanceData.length > 0 ? (
						<ul>
							{supplierBalanceData.map((item: any) => (
								<li key={item.id}>Supplier Balance ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No supplier balance data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
