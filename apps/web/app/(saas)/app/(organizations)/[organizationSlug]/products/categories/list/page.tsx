"use client";

import { fetchCategoriesWithCurrentOrg } from "@saas/organizations/utils/get-current-organization";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../../../../../../../modules/saas/shared/components/PageHeader";

interface Category {
	id: string;
	name: string;
	code: string;
	productCount: number;
}

interface CategoriesResponse {
	items: Category[];
	count: number;
}

async function fetchOrganizationBySlug(slug: string) {
	const response = await fetchCategoriesWithCurrentOrg();
	if (!response.ok) {
		throw new Error("Failed to fetch organization");
	}
	return response.json();
}

async function fetchCategories(organizationId: string, search?: string) {
	const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
	const response = await fetch(
		`/api/category?organizationId=${organizationId}${searchParam}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch categories");
	}
	return response.json() as Promise<CategoriesResponse>;
}

export default function CategoryListPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [searchQuery, setSearchQuery] = useState("");

	const { data: organization } = useQuery({
		queryKey: ["organization", organizationSlug],
		queryFn: () => fetchOrganizationBySlug(organizationSlug),
	});

	const { data, isLoading, refetch } = useQuery<CategoriesResponse>({
		queryKey: ["categories", organization?.id, searchQuery],
		queryFn: async () => {
			if (!organization?.id) return { items: [], count: 0 };
			return fetchCategories(organization.id, searchQuery);
		},
		enabled: !!organization?.id,
	});

	const categories = data?.items || [];
	const totalCategories = data?.count || 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Category" />

			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<form
					onSubmit={handleSearch}
					className="relative w-full max-w-md"
				>
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search categories..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Link
						href={`/app/${organizationSlug}/products/categories/add`}
					>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add category
						</Button>
					</Link>
				</div>
			</div>

			<Card>
				<div className="p-4">
					<div className="rounded-md border">
						<div className="grid grid-cols-4 border-b bg-muted/50 p-4 font-medium">
							<div>NAME</div>
							<div>CODE</div>
							<div>CATEGORY</div>
							<div className="text-right">ACTION</div>
						</div>
						<div className="divide-y">
							{isLoading ? (
								<div className="p-4 text-center">
									Loading...
								</div>
							) : categories.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground">
									No categories found
								</div>
							) : (
								categories.map((category) => (
									<div
										key={category.id}
										className="grid grid-cols-4 items-center p-4"
									>
										<div className="font-medium">
											{category.name}
										</div>
										<div>{category.code}</div>
										<div>{category.productCount}</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/products/categories/edit/${category.id}`,
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
															`Are you sure you want to delete ${category.name}?`,
														)
													) {
														fetch(
															`/api/category/${category.id}`,
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
																			"Failed to delete category",
																		);
																	}
																	refetch();
																	toast.success(
																		"Category deleted successfully",
																	);
																},
															)
															.catch((error) => {
																console.error(
																	"Error deleting category:",
																	error,
																);
																toast.error(
																	"Failed to delete category",
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
