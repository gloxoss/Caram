"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationExpenseCategoriesPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [expenseCategories, setExpenseCategories] = useState([]);

	useEffect(() => {
		const fetchExpenseCategories = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/expense-categories?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch expense categories");
				}
				const data = await response.json();
				setExpenseCategories(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch expense categories");
			}
		};

		fetchExpenseCategories();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Expense Categories" />

			<Card>
				<div className="p-4">
					{expenseCategories.length > 0 ? (
						<ul>
							{expenseCategories.map((expenseCategory: any) => (
								<li key={expenseCategory.id}>Expense Category ID: {expenseCategory.id}</li>
							))}
						</ul>
					) : (
						<p>No expense categories found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
