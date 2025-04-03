"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "next/dist/client/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OutletAddSalaryPayrollPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const outletId = params.outletId as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState({
		employeeId: "",
		amount: "",
		date: "",
	});

	const handleInputChange = (e: any) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		try {
			const response = await fetch(`/api/salary-payrolls`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId, outletId }),
			});
			if (!response.ok) {
				throw new Error("Failed to create salary payroll");
			}
			toast.success("Salary payroll created successfully");
			router.push(`/app/${organizationSlug}/outlets/${outletId}/salary-payroll`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create salary payroll");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Outlet Salary Payroll" />

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
						<Button type="submit">Create Salary Payroll</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}