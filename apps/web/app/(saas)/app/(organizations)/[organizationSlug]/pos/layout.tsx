import { PosPageHeader } from "@saas/pos/components/PosPageHeader";
import type { PropsWithChildren } from "react";

export default function PosLayout({ children }: PropsWithChildren) {
	return (
		<div className="space-y-4">
			<PosPageHeader
				title="Point of Sale"
				subtitle="Manage your sales and inventory"
				breadcrumbs={[
					{
						title: "Home",
						href: "/app",
					},
					{
						title: "POS",
						href: "/app/pos",
					},
				]}
			/>
			{children}
		</div>
	);
}
