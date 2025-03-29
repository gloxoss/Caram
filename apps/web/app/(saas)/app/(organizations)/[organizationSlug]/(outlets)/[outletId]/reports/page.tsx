"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function OutletReportsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [reports, setReports] = useState([
		{ id: "sales-report", name: "Sales Report" },
		{ id: "stock-report", name: "Stock Report" },
		{ id: "expense-report", name: "Expense Report" },
	]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Reports" />

			<Card>
				<div className="p-4">
					{reports.length > 0 ? (
						<ul>
							{reports.map((report: any) => (
								<li key={report.id}>
									<a
										href={`/app/${organizationSlug}/outlets/${outletId}/reports/${report.id}`}
									>
										{report.name}
									</a>
								</li>
							))}
						</ul>
					) : (
						<p>No reports found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
