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

interface Rack {
	id: string;
	name: string;
}

export default function RackEditPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const rackId = params.rackId as string;
	const [name, setName] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	useEffect(() => {
		const fetchRack = async () => {
			if (!organizationId || !rackId) return;

			try {
				const response = await fetch(
					`/api/racks/${rackId}?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch rack");
				}

				const rack: Rack = await response.json();
				setName(rack.name);
			} catch (error: any) {
				console.error("Error fetching rack:", error);
				toast.error("Failed to fetch rack");
			}
		};

		fetchRack();
	}, [organizationId, rackId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId || !rackId) {
			toast.error("Organization ID and Rack ID are required");
			return;
		}

		try {
			const response = await fetch(`/api/racks/${rackId}`, {
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
				throw new Error("Failed to update rack");
			}

			toast.success("Rack updated successfully");
			router.push(`/app/${organizationSlug}/products/racks/list`);
		} catch (error: any) {
			console.error("Error updating rack:", error);
			toast.error("Failed to update rack");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Edit Rack" />

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
								placeholder="Rack name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<Button type="submit">Update rack</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
