"use client";
import type { Product } from "@repo/database";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useQuery } from "@tanstack/react-query";

interface ProductWithStock extends Product {
	totalStock: number;
	image?: string | null;
}

interface ProductsResponse {
	items: ProductWithStock[];
	count: number;
}

async function fetchProducts(organizationId: string) {
	const response = await fetch(
		`/api/product?organizationId=${organizationId}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch products");
	}
	return response.json() as Promise<ProductsResponse>;
}

export function useProducts() {
	const { activeOrganization } = useActiveOrganization();

	const { data, isLoading, error } = useQuery<ProductsResponse>({
		queryKey: ["products", activeOrganization?.id],
		queryFn: () => fetchProducts(activeOrganization?.id || ""),
		enabled: !!activeOrganization?.id,
	});

	return {
		products: data?.items || [],
		totalCount: data?.count || 0,
		isLoading,
		error,
	};
}
