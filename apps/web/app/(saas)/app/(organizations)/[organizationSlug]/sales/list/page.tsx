"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Sale {
	id: string;
	totalAmount: number;
	createdAt: string;
	status: string;
	outlet: {
		name: string;
	};
	customer: {
		name: string;
		phone: string;
	} | null;
	user: {
		name: string;
		email: string;
	};
	saleItems: {
		product: {
			name: string;
		};
	}[];
}

interface SalesResponse {
	items: Sale[];
	total: number;
}

async function fetchSales(organizationId: string, search?: string) {
	const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
	const response = await fetch(
		`/api/sales?organizationId=${organizationId}${searchParam}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch sales");
	}
	const data = await response.json();
	return data as SalesResponse;
}

export default function SalesListPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [searchQuery, setSearchQuery] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["sales", organizationId, searchQuery],
		queryFn: async () => {
			if (!organizationId) return { items: [], total: 0 };
			return fetchSales(organizationId, searchQuery);
		},
		enabled: !!organizationId,
	});

	const sales = data ? data.items : [];
	const totalSales = data ? data.total : 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Sales" />

			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<form
					onSubmit={handleSearch}
					className="relative w-full max-w-md"
				>
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search sales..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Link href={`/app/${organizationSlug}/sales/add`}>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add Sale
						</Button>
					</Link>
				</div>
			</div>

			<Card>
				<div className="p-4">
					<div className="rounded-md border">
						<div className="grid grid-cols-5 border-b bg-muted/50 p-4 font-medium">
							<div>Date</div>
							<div>Outlet</div>
							<div>Customer</div>
							<div>Total Amount</div>
							<div className="text-right">Actions</div>
						</div>
						<div className="divide-y">
							{isLoading ? (
								<div className="p-4 text-center">
									Loading...
								</div>
							) : sales.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground">
									No sales found
								</div>
							) : (
								sales.map((sale) => (
									<div
										key={sale.id}
										className="grid grid-cols-5 items-center p-4"
									>
										<div>
											{new Date(
												sale.createdAt,
											).toLocaleDateString()}
										</div>
										<div>{sale.outlet.name}</div>
										<div>
											{sale.customer?.name || "N/A"}
										</div>
										<div>{sale.totalAmount}</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/sales/edit/${sale.id}`,
													)
												}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="h-4 w-4"
												>
													<title>Edit</title>
													<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
													<path d="m15 5 4 4" />
												</svg>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive"
												onClick={() => {
													if (
														confirm(
															"Are you sure you want to delete this sale?",
														)
													) {
														fetch(
															`/api/sales/${sale.id}`,
															{
																method: "DELETE",
																headers: {
																	"Content-Type":
																		"application/json",
																},
																body: JSON.stringify(
																	{
																		organizationId:
																			organizationSlug,
																	},
																),
															},
														)
															.then(
																(response) => {
																	if (
																		!response.ok
																	) {
																		throw new Error(
																			"Failed to delete sale",
																		);
																	}
																	refetch();
																	toast.success(
																		"Sale deleted successfully",
																	);
																},
															)
															.catch((error) => {
																console.error(
																	"Error deleting sale:",
																	error,
																);
																toast.error(
																	"Failed to delete sale",
																);
															});
													}
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="h-4 w-4"
												>
													<title>Delete</title>
													<path d="M3 6h18" />
													<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
													<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
													<path d="M10 11v6" />
													<path d="M14 11v6" />
												</svg>
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
