import { NextResponse } from "next/server";
import {
	createCustomerGroup,
	getCustomerGroups,
	updateCustomerGroup,
} from "./route";

export async function GET() {
	try {
		const customerGroups = await getCustomerGroups();
		return NextResponse.json(customerGroups);
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to fetch customer groups" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const data = await request.json();
		const customerGroup = await createCustomerGroup(data);
		return NextResponse.json(customerGroup);
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to create customer group" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: Request) {
	try {
		const data = await request.json();
		const customerGroup = await updateCustomerGroup(data);
		return NextResponse.json(customerGroup);
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to update customer group" },
			{ status: 500 },
		);
	}
}
