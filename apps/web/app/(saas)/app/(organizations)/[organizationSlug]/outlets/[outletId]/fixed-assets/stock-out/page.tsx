"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletStockOutPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [stockOuts, setStockOuts] = useState([]);

	useEffect(() => {
		const fetchStockOuts = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/stock-outs?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch stock outs");
				}
				const data = await response.json();
				setStockOuts(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch stock outs");
			}
		};

		fetchStockOuts();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Stock Outs" />

			<Card>
				<div className="p-4">
					{stockOuts.length > 0 ? (
						<ul>
							{stockOuts.map((stockOut: any) => (
								<li key={stockOut.id}>Stock Out ID: {stockOut.id}</li>
							))}
						</ul>
					) : (
						<p>No stock outs found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}