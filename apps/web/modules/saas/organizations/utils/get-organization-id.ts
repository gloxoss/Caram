/**
 * Utility function to retrieve the organization ID from the user's session or context
 */
import { authClient } from "@repo/auth/client";
import { useActiveOrganization } from "../hooks/use-active-organization";

/**
 * Gets the current organization ID from cookies or session
 * @returns The organization ID or null if not found
 */
export async function getOrganizationId(): Promise<string | null> {
	try {
		// Try to get the organization ID from the session
		const session = await authClient.getSession();
		if (session.data?.session?.activeOrganizationId) {
			return session.data.session.activeOrganizationId;
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
 * React hook to get the organization ID
 * @returns The organization ID or null if not found
 */
export function useOrganizationId(): string | null {
	const { activeOrganization } = useActiveOrganization();
	return activeOrganization ? activeOrganization.id || null : null;
}
