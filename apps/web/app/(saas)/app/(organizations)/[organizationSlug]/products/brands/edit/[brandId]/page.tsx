"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Brand {
	id: string;
	name: string;
}

export default function BrandEditPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const brandId = params.brandId as string;
	const [name, setName] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	useEffect(() => {
		const fetchBrand = async () => {
			if (!organizationId || !brandId) return;

			try {
				const response = await fetch(
					`/api/brand/${brandId}?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch brand");
				}

				const brand: Brand = await response.json();
				setName(brand.name);
			} catch (error: any) {
				console.error("Error fetching brand:", error);
				toast.error("Failed to fetch brand");
			}
		};

		fetchBrand();
	}, [organizationId, brandId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId || !brandId) {
			toast.error("Organization ID and Brand ID are required");
			return;
		}

		try {
			const response = await fetch(`/api/brand/${brandId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					organizationId,
					name,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update brand");
			}

			toast.success("Brand updated successfully");
			router.push(`/app/${organizationSlug}/products/brands/list`);
		} catch (error: any) {
			console.error("Error updating brand:", error);
			toast.error("Failed to update brand");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Edit Brand" />

			<Card>
				<div className="p-4">
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4"
					>
						<div>
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								placeholder="Brand name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<Button type="submit">Update brand</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
