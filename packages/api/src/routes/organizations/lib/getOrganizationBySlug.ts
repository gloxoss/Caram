import { db } from "@repo/database";

/**
 * Fetches an organization by its slug and returns the organization ID
 * @param slug The organization slug
 * @returns The organization ID or null if not found
 */
export async function getOrganizationBySlug(slug: string): Promise<string> {
	if (!slug) {
		return "";
	}

	try {
		const organization = await db.organization.findUnique({
			where: {
				slug,
			},
			select: {
				id: true,
			},
		});

		return organization?.id || "";
	} catch (error) {
		console.error("Error fetching organization by slug:", error);
		return "";
	}
}
