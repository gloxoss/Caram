"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletSupplierPaymentPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [supplierPayments, setSupplierPayments] = useState([]);

	useEffect(() => {
		const fetchSupplierPayments = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/supplier-payments?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch supplier payments");
				}
				const data = await response.json();
				setSupplierPayments(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch supplier payments");
			}
		};

		fetchSupplierPayments();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Supplier Payments" />

			<Card>
				<div className="p-4">
					{supplierPayments.length > 0 ? (
						<ul>
							{supplierPayments.map((supplierPayment: any) => (
								<li key={supplierPayment.id}>Supplier Payment ID: {supplierPayment.id}</li>
							))}
						</ul>
					) : (
						<p>No supplier payments found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}