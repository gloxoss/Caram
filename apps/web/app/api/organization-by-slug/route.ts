import { db } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const slug = url.searchParams.get("slug");

	if (!slug) {
		return NextResponse.json(
			{ error: "Organization slug is required" },
			{ status: 400 },
		);
	}

	try {
		const organization = await db.organization.findUnique({
			where: {
				id: slug,
			},
		});

		if (!organization) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(organization);
	} catch (error) {
		console.error("Error fetching organization:", error);
		return NextResponse.json(
			{ error: "Failed to fetch organization" },
			{ status: 500 },
		);
	}
}
