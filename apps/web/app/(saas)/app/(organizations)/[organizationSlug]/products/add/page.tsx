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

export default function ProductAddPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState(0);
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId) {
			toast.error("Organization ID is required");
			return;
		}

		try {
			const response = await fetch("/api/product", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					organizationId,
					name,
					description,
					price,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create product");
			}

			toast.success("Product created successfully");
			router.push(`/app/${organizationSlug}/products/list`);
		} catch (error: any) {
			console.error("Error creating product:", error);
			toast.error("Failed to create product");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Product" />

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
								placeholder="Product name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div>
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								type="text"
								placeholder="Product description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="price">Price</Label>
							<Input
								id="price"
								type="number"
								placeholder="Product price"
								value={price}
								onChange={(e) =>
									setPrice(Number(e.target.value))
								}
								required
							/>
						</div>
						<Button type="submit">
							<PlusIcon className="mr-2 h-4 w-4" />
							Add product
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
