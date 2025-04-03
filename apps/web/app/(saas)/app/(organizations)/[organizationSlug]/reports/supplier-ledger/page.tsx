"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationSupplierLedgerReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [supplierLedgerData, setSupplierLedgerData] = useState([]);

	useEffect(() => {
		const fetchSupplierLedgerData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/supplier-ledger?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch supplier ledger data");
				}
				const data = await response.json();
				setSupplierLedgerData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch supplier ledger data");
			}
		};

		fetchSupplierLedgerData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Supplier Ledger Report" />

			<Card>
				<div className="p-4">
					{supplierLedgerData.length > 0 ? (
						<ul>
							{supplierLedgerData.map((item: any) => (
								<li key={item.id}>Supplier Ledger ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No supplier ledger data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
