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

interface Brand {
	id: string;
	name: string;
}

interface BrandsResponse {
	items?: Brand[];
	count?: number;
}

async function fetchBrands(organizationId: string, search?: string) {
	const searchParam = search
		? `&amp;search=${encodeURIComponent(search)}`
		: "";
	const response = await fetch(
		`/api/brands?organizationId=${organizationId}${searchParam}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch brands");
	}
	console.log("response:", response); // Add this line to log the response variable
	const data = await response.json();
	console.log("data:", data); // Add this line to log the data variable
	return data as BrandsResponse;
}

export default function BrandListPage() {
	"use client"; // Add this line to explicitly mark the component as a client component

	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [searchQuery, setSearchQuery] = useState("");
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	console.log("organizationId:", organizationId); // Add this line to log the organizationId variable

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["brands", organizationId, searchQuery],
		queryFn: async () => {
			if (!organizationId) return { items: [], count: 0 };
			return fetchBrands(organizationId, searchQuery);
		},
		enabled: !!organizationId,
	});

	const brands = data ? data.items || [] : [];
	const totalBrands = data ? data.count || 0 : 0;
	if (organizationId !== undefined) {
		// const br = fetchBrands(organizationId, searchQuery);
		// console.log("brands:", br); // Add this line to log the brands variabl
	}
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Brands" />

			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<form
					onSubmit={handleSearch}
					className="relative w-full max-w-md"
				>
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search brands..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Link href={`/app/${organizationSlug}/products/brands/add`}>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add brand
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
							) : brands.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground">
									No brands found
								</div>
							) : (
								brands.map((brand) => (
									<div
										key={brand.id}
										className="grid grid-cols-3 items-center p-4"
									>
										<div className="font-medium">
											{brand.name}
										</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/products/brands/edit/${brand.id}`,
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
															`Are you sure you want to delete ${brand.name}?`,
														)
													) {
														fetch(
															`/api/brands/${brand.id}`,
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
																			"Failed to delete brand",
																		);
																	}
																	refetch();
																	toast.success(
																		"Brand deleted successfully",
																	);
																},
															)
															.catch((error) => {
																console.error(
																	"Error deleting brand:",
																	error,
																);
																toast.error(
																	"Failed to delete brand",
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
