"use client";

import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { FolderXIcon } from "lucide-react";
import Link from "next/link";

export default function PosNotFound() {
	return (
		<Card className="flex flex-col items-center justify-center p-8 text-center">
			<FolderXIcon className="h-12 w-12 text-muted-foreground" />
			<h2 className="mt-4 text-xl font-semibold">Page Not Found</h2>
			<p className="mt-2 text-muted-foreground">
				The POS page you&apos;re looking for doesn&apos;t exist or you
				don&apos;t have access to it.
			</p>
			<Button asChild className="mt-4">
				<Link href="/app">Return Home</Link>
			</Button>
		</Card>
	);
}
