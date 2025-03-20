import { AiChat } from "@saas/ai/components/AiChat";
import { aiChatListQueryKey, aiChatQueryKey } from "@saas/ai/lib/api";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { apiClient } from "@shared/lib/api-client";
import { getQueryClient } from "@shared/lib/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AiDemoPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);
	const queryClient = getQueryClient();

	if (!organization) {
		redirect("/app");
	}

	const organizationId = organization.id;

	// Get all headers and cookies for authentication
	const headersList = headers();
	const cookiesList = cookies();
	
	const headerObject = {
		...Object.fromEntries(headersList.entries()),
		cookie: cookiesList.toString(),
	};

	// Fetch chats with error handling
	let chats = [];
	try {
		const response = await apiClient.ai.chats.$get(
			{
				query: {
					organizationId,
				},
			},
			{
				headers: headerObject,
			},
		);

		if (!response.ok) {
			console.error("Failed to fetch chats:", await response.text());
			// Return empty array instead of throwing
			chats = [];
		} else {
			chats = await response.json();
		}
	} catch (error) {
		console.error("Error fetching chats:", error);
		// Return empty array on error
		chats = [];
	}

	// Prefetch chat list
	await queryClient.prefetchQuery({
		queryKey: aiChatListQueryKey(organizationId),
		queryFn: async () => chats,
	});

	// Prefetch first chat if available
	if (chats.length > 0) {
		try {
			const response = await apiClient.ai.chats[":id"].$get(
				{
					param: {
						id: chats[0].id,
					},
				},
				{ headers: headerObject },
			);

			if (response.ok) {
				const chatData = await response.json();
				await queryClient.prefetchQuery({
					queryKey: aiChatQueryKey(chats[0].id),
					queryFn: async () => chatData,
				});
			} else {
				console.error("Failed to fetch individual chat:", await response.text());
			}
		} catch (error) {
			console.error("Error fetching individual chat:", error);
		}
	}

	return (
		<>
			<PageHeader
				title="AI Chatbot"
				subtitle="This is an example chatbot built with the OpenAI API"
			/>

			<AiChat organizationId={organizationId} />
		</>
	);
}
