"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletEmployeeSalesReportPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [employeeSalesData, setEmployeeSalesData] = useState([]);

	useEffect(() => {
		const fetchEmployeeSalesData = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/reports/employee-sales?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch employee sales data");
				}
				const data = await response.json();
				setEmployeeSalesData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch employee sales data");
			}
		};

		fetchEmployeeSalesData();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Employee Sales Report" />

			<Card>
				<div className="p-4">
					{employeeSalesData.length > 0 ? (
						<ul>
							{employeeSalesData.map((item: any) => (
								<li key={item.id}>Employee Sales ID: {item.id}</li>
							))}
						</ul>
					) : (
						<p>No employee sales data found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
