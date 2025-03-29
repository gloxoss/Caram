"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { PlusIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RackAddPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [name, setName] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId) {
			toast.error("Organization ID is required");
			return;
		}

		try {
			const response = await fetch("/api/racks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					organizationId,
					name,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create rack");
			}

			toast.success("Rack created successfully");
			router.push(`/app/${organizationSlug}/products/racks/list`);
		} catch (error: any) {
			console.error("Error creating rack:", error);
			toast.error("Failed to create rack");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Rack" />

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
						<Button type="submit">
							<PlusIcon className="mr-2 h-4 w-4" />
							Add rack
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
