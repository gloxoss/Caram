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

interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
}

export default function ProductEditPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const productId = params.productId as string;
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState(0);
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	useEffect(() => {
		const fetchProduct = async () => {
			if (!organizationId || !productId) return;

			try {
				const response = await fetch(
					`/api/product/${productId}?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch product");
				}

				const product: Product = await response.json();
				setName(product.name);
				setDescription(product.description);
				setPrice(product.price);
			} catch (error: any) {
				console.error("Error fetching product:", error);
				toast.error("Failed to fetch product");
			}
		};

		fetchProduct();
	}, [organizationId, productId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId || !productId) {
			toast.error("Organization ID and Product ID are required");
			return;
		}

		try {
			const response = await fetch(`/api/product/${productId}`, {
				method: "PUT",
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
				throw new Error("Failed to update product");
			}

			toast.success("Product updated successfully");
			router.push(`/app/${organizationSlug}/products/list`);
		} catch (error: any) {
			console.error("Error updating product:", error);
			toast.error("Failed to update product");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Edit Product" />

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
						<Button type="submit">Update product</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
