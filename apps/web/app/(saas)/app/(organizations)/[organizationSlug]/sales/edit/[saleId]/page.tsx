"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { PlusIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SaleEditPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const saleId = params.saleId as string;
	const [totalAmount, setTotalAmount] = useState("");
	const [status, setStatus] = useState("completed");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	useEffect(() => {
		const fetchSale = async () => {
			if (!organizationId || !saleId) return;

			try {
				const response = await fetch(
					`/api/sales/${saleId}?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch sale");
				}
				const data = await response.json();
				setTotalAmount(data.totalAmount.toString());
				setStatus(data.status);
			} catch (error: any) {
				console.error("Error fetching sale:", error);
				toast.error("Failed to fetch sale");
			}
		};

		fetchSale();
	}, [organizationId, saleId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId || !saleId) {
			toast.error("Organization ID and Sale ID are required");
			return;
		}

		try {
			const response = await fetch(`/api/sales/${saleId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					organizationId,
					totalAmount: Number.parseFloat(totalAmount),
					status,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update sale");
			}

			toast.success("Sale updated successfully");
			router.push(`/app/${organizationSlug}/sales/list`);
		} catch (error: any) {
			console.error("Error updating sale:", error);
			toast.error("Failed to update sale");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Edit Sale" />

			<Card>
				<div className="p-4">
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4"
					>
						<div>
							<Label htmlFor="totalAmount">Total Amount</Label>
							<Input
								id="totalAmount"
								type="number"
								placeholder="Total Amount"
								value={totalAmount}
								onChange={(e) => setTotalAmount(e.target.value)}
								required
							/>
						</div>
						<div>
							<Label htmlFor="status">Status</Label>
							<Input
								id="status"
								type="text"
								placeholder="Status"
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								required
							/>
						</div>
						<Button type="submit">
							<PlusIcon className="mr-2 h-4 w-4" />
							Update sale
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
