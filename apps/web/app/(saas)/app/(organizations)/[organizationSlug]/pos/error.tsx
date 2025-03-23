"use client";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { AlertTriangleIcon } from "lucide-react";
import { useEffect } from "react";

interface ErrorProps {
	error: Error;
	reset: () => void;
}

export default function PosError({ error, reset }: ErrorProps) {
	useEffect(() => {
		console.error("POS Error:", error);
	}, [error]);

	return (
		<Card className="flex flex-col items-center justify-center p-8 text-center">
			<AlertTriangleIcon className="h-12 w-12 text-destructive" />
			<h2 className="mt-4 text-xl font-semibold">
				Something went wrong!
			</h2>
			<p className="mt-2 text-muted-foreground">
				{error.message ||
					"An error occurred while loading the POS system."}
			</p>
			<Button onClick={reset} className="mt-4">
				Try again
			</Button>
		</Card>
	);
}
