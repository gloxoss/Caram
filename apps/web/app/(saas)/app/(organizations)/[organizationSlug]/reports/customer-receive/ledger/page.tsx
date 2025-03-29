"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationCustomerReceiveLedgerReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [customerReceiveLedgerData, setCustomerReceiveLedgerData] = useState([]);

	useEffect(() => {
		const fetchCustomerReceiveLedgerData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/customer-receive/ledger?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch customer receive ledger data");
				}
				const data = await response.json();
				setCustomerReceiveLedgerData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch customer receive ledger data");
			}
		};

		fetchCustomerReceiveLedgerData();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Customer Receive Ledger Report" />

			<Card>
				<div className="p-4">
					{customerReceiveLedgerData.length > 0 ? (
						<ul>
							{customerReceiveLedgerData.map((item: any) => (
								<li key={item.id}>Customer Receive Ledger ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No customer receive ledger data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
