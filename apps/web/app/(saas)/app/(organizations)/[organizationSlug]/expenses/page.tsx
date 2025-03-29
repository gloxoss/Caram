"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationExpensesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [expenses, setExpenses] = useState([]);

	useEffect(() => {
		const fetchExpenses = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/expenses?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch expenses");
				}
				const data = await response.json();
				setExpenses(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch expenses");
			}
		};

		fetchExpenses();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Expenses" />

			<Card>
				<div className="p-4">
					{expenses.length > 0 ? (
						<ul>
							{expenses.map((expense: any) => (
								<li key={expense.id}>Expense ID: {expense.id}</li>
							))}
						</ul>
					) : (
						<p>No expenses found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}