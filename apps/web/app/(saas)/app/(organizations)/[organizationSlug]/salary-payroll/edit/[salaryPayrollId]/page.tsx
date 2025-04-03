"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationEditSalaryPayrollPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const salaryPayrollId = params.salaryPayrollId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState({
		employeeId: "",
		amount: "",
		date: "",
	});

	useEffect(() => {
		const fetchSalaryPayroll = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/salary-payrolls/${salaryPayrollId}?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch salary payroll");
				}
				const data = await response.json();
				setFormData(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch salary payroll");
			}
		};

		fetchSalaryPayroll();
	}, [organizationId, salaryPayrollId]);

	const handleInputChange = (e: any) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		try {
			const response = await fetch(`/api/salary-payrolls/${salaryPayrollId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});
			if (!response.ok) {
				throw new Error("Failed to update salary payroll");
			}
			toast.success("Salary payroll updated successfully");
			router.push(`/app/${organizationSlug}/salary-payroll`);
		} catch (error: any) {
			toast.error(error.message || "Failed to update salary payroll");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Edit Organization Salary Payroll" />

			<Card>
				<div className="p-4">
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Input
							type="text"
							name="employeeId"
							placeholder="Employee ID"
							onChange={handleInputChange}
						/>
						<Input
							type="number"
							name="amount"
							placeholder="Amount"
							onChange={handleInputChange}
						/>
						<Input
							type="date"
							name="date"
							placeholder="Date"
							onChange={handleInputChange}
						/>
						<Button type="submit">Update Salary Payroll</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
