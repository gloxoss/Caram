"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletStockPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [stock, setStock] = useState([]);

	useEffect(() => {
		const fetchStock = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/stock?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch stock");
				}
				const data = await response.json();
				setStock(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch stock");
			}
		};

		fetchStock();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Stock" />

			<Card>
				<div className="p-4">
					{stock.length > 0 ? (
						<ul>
							{stock.map((item: any) => (
								<li key={item.id}>
									Product: {item.productId}, Quantity:{" "}
									{item.quantity}
								</li>
							))}
						</ul>
					) : (
						<p>No stock found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
