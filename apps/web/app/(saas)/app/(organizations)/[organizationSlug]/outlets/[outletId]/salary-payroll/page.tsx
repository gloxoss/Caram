"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletSalaryPayrollPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [salaryPayrolls, setSalaryPayrolls] = useState([]);

	useEffect(() => {
		const fetchSalaryPayrolls = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/salary-payrolls?organizationId=${organizationId}&outletId=${outletId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch salary payrolls");
				}
				const data = await response.json();
				setSalaryPayrolls(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch salary payrolls");
			}
		};

		fetchSalaryPayrolls();
	}, [organizationId, outletId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlet Salary Payrolls" />

			<Card>
				<div className="p-4">
					{salaryPayrolls.length > 0 ? (
						<ul>
							{salaryPayrolls.map((salaryPayroll: any) => (
								<li key={salaryPayroll.id}>Salary Payroll ID: {salaryPayroll.id}</li>
							))}
						</ul>
					) : (
						<p>No salary payrolls found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}