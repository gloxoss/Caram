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

interface Rack {
	id: string;
	name: string;
}

interface RacksResponse {
	items: Rack[];
	count: number;
}

async function fetchRacks(organizationId: string, search?: string) {
	const searchParam = search
		? `&amp;search=${encodeURIComponent(search)}`
		: "";
	const response = await fetch(
		`/api/racks?organizationId=${organizationId}${searchParam}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch racks");
	}
	return response.json() as Promise<RacksResponse>;
}

export default function RackListPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [searchQuery, setSearchQuery] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const { data, isLoading, refetch } = useQuery<RacksResponse>({
		queryKey: ["racks", organizationId, searchQuery],
		queryFn: async () => {
			if (!organizationId) return { items: [], count: 0 };
			return fetchRacks(organizationId, searchQuery);
		},
		enabled: !!organizationId,
	});

	const racks = data?.items || [];
	const totalRacks = data?.count || 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Racks" />

			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<form
					onSubmit={handleSearch}
					className="relative w-full max-w-md"
				>
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search racks..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Link href={`/app/${organizationSlug}/products/racks/add`}>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add rack
						</Button>
					</Link>
				</div>
			</div>

			<Card>
				<div className="p-4">
					<div className="rounded-md border">
						<div className="grid grid-cols-3 border-b bg-muted/50 p-4 font-medium">
							<div>NAME</div>
							<div className="text-right">ACTION</div>
						</div>
						<div className="divide-y">
							{isLoading ? (
								<div className="p-4 text-center">
									Loading...
								</div>
							) : racks.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground">
									No racks found
								</div>
							) : (
								racks.map((rack) => (
									<div
										key={rack.id}
										className="grid grid-cols-3 items-center p-4"
									>
										<div className="font-medium">
											{rack.name}
										</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/products/racks/edit/${rack.id}`,
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
															`Are you sure you want to delete ${rack.name}?`,
														)
													) {
														fetch(
															`/api/racks/${rack.id}`,
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
																			"Failed to delete rack",
																		);
																	}
																	refetch();
																	toast.success(
																		"Rack deleted successfully",
																	);
																},
															)
															.catch((error) => {
																console.error(
																	"Error deleting rack:",
																	error,
																);
																toast.error(
																	"Failed to delete rack",
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
