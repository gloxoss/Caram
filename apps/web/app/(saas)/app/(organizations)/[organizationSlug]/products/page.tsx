"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Card } from "@ui/components/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OrganizationProductsPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [products, setProducts] = useState([]);

	useEffect(() => {
		const fetchProducts = async () => {
			if (!organizationId) return;
			try {
				const response = await fetch(
					`/api/products?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch products");
				}
				const data = await response.json();
				setProducts(data);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch products");
			}
		};

		fetchProducts();
	}, [organizationId]);

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Organization Products" />

			<Card>
				<div className="p-4">
					{products.length > 0 ? (
						<ul>
							{products.map((product: any) => (
								<li key={product.id}>{product.name}</li>
							))}
						</ul>
					) : (
						<p>No products found.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
