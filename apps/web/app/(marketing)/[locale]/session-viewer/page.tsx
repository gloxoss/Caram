import { getSession } from "@saas/auth/lib/server";
import SessionDisplay from "../../../../modules/SessionDisplay";

export default async function SessionViewerPage() {
	const session = await getSession();

	return (
		<div>
			<h1>Session Viewer</h1>
			<SessionDisplay sessionData={session} />
		</div>
	);
}
