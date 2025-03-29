"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletCustomerReceiveBalanceReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [customerReceiveBalanceData, setCustomerReceiveBalanceData] = useState([]);

	useEffect(() => {
		const fetchCustomerReceiveBalanceData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/customer-receive/balance?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch customer receive balance data");
				}
				const data = await response.json();
				setCustomerReceiveBalanceData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch customer receive balance data");
			}
		};

		fetchCustomerReceiveBalanceData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Customer Receive Balance Report" />

			<Card>
				<div className="p-4">
					{customerReceiveBalanceData.length > 0 ? (
						<ul>
							{customerReceiveBalanceData.map((item: any) => (
								<li key={item.id}>Customer Receive Balance ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No customer receive balance data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}