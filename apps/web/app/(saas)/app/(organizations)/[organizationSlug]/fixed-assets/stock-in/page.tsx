"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationStockInPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [stockIns, setStockIns] = useState([]);

	useEffect(() => {
		const fetchStockIns = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/stock-ins?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch stock ins");
				}
				const data = await response.json();
				setStockIns(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch stock ins");
			}
		};

		fetchStockIns();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Stock Ins" />

			<Card>
				<div className="p-4">
					{stockIns.length > 0 ? (
						<ul>
							{stockIns.map((stockIn: any) => (
								<li key={stockIn.id}>Stock In ID: {stockIn.id}</li>
							))}
						</ul>
					) : (
						<p>No stock ins found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
