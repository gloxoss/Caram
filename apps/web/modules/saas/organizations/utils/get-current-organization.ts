/**
 * Utility function to retrieve the current organization ID from the user's session
 * and use it in API requests
 */
import { authClient } from "@repo/auth/client";
import { z } from "zod";

const formSchema = z.object({
	name: z.string().min(3, {
		message: "Name must be at least 3 characters",
	}),
	code: z.string().min(2, {
		message: "Code must be at least 2 characters",
	}),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Gets the current organization ID from the session
 * @returns The organization ID or null if not found
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
	try {
		// Try to get the organization ID from the session
		const session = await authClient.getSession();
		if (session.data?.session.activeOrganizationId) {
			return session.data?.session.activeOrganizationId;
		}

		// If no active organization in session, try to get the first organization from the list
		const organizations = await authClient.useListOrganizations();
		if (organizations?.data && organizations.data.length > 0) {
			return organizations.data[0].id;
		}

		return null;
	} catch (error) {
		console.error("Error retrieving organization ID:", error);
		return null;
	}
}

/**
 * Fetches categories using the current organization ID
 * @returns Promise with categories data
 */
export async function fetchCategoriesWithCurrentOrg() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		throw new Error("No organization ID found");
	}

	const response = await fetch(
		`http://localhost:3000/api/category?organizationId=${organizationId}`,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch categories");
	}

	return response.json();
}

/**
 * Fetches categories using the current organization ID
 * @returns Promise with categories data
 */
export async function fetchCategoriesWithCurrentOrgPost(values: FormValues) {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		throw new Error("No organization ID found");
	}

	const response = await fetch("/api/category", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			...values,
			organizationId: organizationId,
		}),
	});
	return response;
}
