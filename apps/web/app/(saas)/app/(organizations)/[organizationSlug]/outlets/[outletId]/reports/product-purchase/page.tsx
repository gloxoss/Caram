"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletProductPurchaseReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [productPurchaseData, setProductPurchaseData] = useState([]);

	useEffect(() => {
		const fetchProductPurchaseData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/product-purchase?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch product purchase data");
				}
				const data = await response.json();
				setProductPurchaseData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch product purchase data");
			}
		};

		fetchProductPurchaseData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Product Purchase Report" />

			<Card>
				<div className="p-4">
					{productPurchaseData.length > 0 ? (
						<ul>
							{productPurchaseData.map((item: any) => (
								<li key={item.id}>Product Purchase ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No product purchase data found.</p>
					)}
				</div>
			</Card>
