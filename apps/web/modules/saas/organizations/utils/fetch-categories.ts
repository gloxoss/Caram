import type { Category } from "@repo/database";
import { useQuery } from "@tanstack/react-query";
/**
 * Utility function to fetch categories using the organization ID from the user's session
 */
import { getOrganizationId, useOrganizationId } from "./get-organization-id";

interface CategoriesResponse {
	items: Category[];
	count: number;
}

/**
 * Fetches categories for the current organization
 * @returns Promise with categories data
 */
export async function fetchCategories(): Promise<CategoriesResponse> {
	const organizationId = await getOrganizationId();

	if (!organizationId) {
		throw new Error("No organization ID found");
	}

	const response = await fetch(
		`/api/category?organizationId=${organizationId}`,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch categories");
	}

	return response.json();
}

/**
 * React hook to fetch categories for the current organization
 * @returns Query result with categories data
 */
export function useCategoriesQuery() {
	const organizationId = useOrganizationId();

	return useQuery<CategoriesResponse>({
		queryKey: ["categories", organizationId],
		queryFn: fetchCategories,
		enabled: !!organizationId,
	});
}
