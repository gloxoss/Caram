"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Skeleton } from "@ui/components/skeleton";
import { FilterIcon, SearchIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "../../../../../../../../modules/saas/pos/lib/utils";
import { PageHeader } from "../../../../../../../../modules/saas/shared/components/PageHeader";

interface Product {
	id: string;
	name: string;
	description: string | null;
	price: number;
	totalStock: number;
	image?: string | null;
}

interface ProductsResponse {
	items: Product[];
	count: number;
}

async function fetchProducts(organizationId: string, search?: string) {
	const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
	const response = await fetch(
		"http://localhost:3000/api/product?organizationId=uFCEG2u6fXrpLehPKKPCY7FK51E1Juym",
	);
	if (!response.ok) {
		throw new Error("Failed to fetch products");
	}
	return response.json() as Promise<ProductsResponse>;
}

export default function ProductListPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading, refetch } = useQuery<ProductsResponse>({
		queryKey: ["products", organizationSlug, searchQuery],
		queryFn: () => fetchProducts(organizationSlug, searchQuery),
	});

	const products = data?.items || [];
	const totalProducts = data?.count || 0;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader
				title="Products"
				/* description="Manage your product inventory"
				actions={
					<div className="flex gap-2">
						<Link
							href={`/app/${organizationSlug}/products/items/bulk-update`}
						>
							<Button variant="outline">Bulk Update</Button>
						</Link>
						<Link
							href={`/app/${organizationSlug}/products/items/add`}
						>
							<Button>
								<PlusIcon className="mr-2 h-4 w-4" />
								Add New Product
							</Button>
						</Link>
					</div>
				} */
			/>

			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<form
					onSubmit={handleSearch}
					className="relative w-full max-w-md"
				>
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search products..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<FilterIcon className="mr-2 h-4 w-4" />
						Filter
					</Button>
					<select
						className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
						defaultValue="name-asc"
					>
						<option value="name-asc">Name (A-Z)</option>
						<option value="name-desc">Name (Z-A)</option>
						<option value="price-asc">Price (Low to High)</option>
						<option value="price-desc">Price (High to Low)</option>
						<option value="stock-asc">Stock (Low to High)</option>
						<option value="stock-desc">Stock (High to Low)</option>
					</select>
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{Array.from({ length: 10 }).map((_, i) => (
						<Card key={i} className="flex flex-col">
							<Skeleton className="aspect-square w-full rounded-t-lg" />
							<div className="p-4">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="mt-2 h-4 w-1/2" />
								<div className="mt-4 flex items-center justify-between">
									<Skeleton className="h-4 w-1/4" />
									<Skeleton className="h-4 w-1/4" />
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{products.map((product) => (
							<Link
								key={product.id}
								href={`/app/${organizationSlug}/products/items/edit/${product.id}`}
								className="group"
							>
								<Card className="flex h-full cursor-pointer flex-col transition-transform hover:scale-105">
									<div className="relative aspect-square w-full overflow-hidden rounded-t-lg">
										{product.image ? (
											<Image
												src={product.image}
												alt={product.name}
												fill
												className="object-cover"
												sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-muted">
												<span className="text-2xl">
													📦
												</span>
											</div>
										)}
										{product.totalStock <= 0 && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/50">
												<span className="text-sm font-medium text-white">
													Out of Stock
												</span>
											</div>
										)}
									</div>
									<div className="flex flex-1 flex-col gap-1 p-4">
										<h3 className="font-medium line-clamp-1">
											{product.name}
										</h3>
										<p className="text-sm text-muted-foreground line-clamp-1">
											{product.description}
										</p>
										<div className="mt-auto flex items-center justify-between pt-2">
											<p className="font-semibold text-primary">
												{formatCurrency(product.price)}
											</p>
											<p className="text-sm text-muted-foreground">
												Stock: {product.totalStock}
											</p>
										</div>
									</div>
								</Card>
							</Link>
						))}
					</div>

					<div className="mt-6 flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							Showing 1 to {products.length} of {totalProducts}{" "}
							results
						</p>
						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								disabled={true}
								className="h-8 w-8 p-0"
							>
								<span className="sr-only">
									Go to previous page
								</span>
								<span>‹</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0 bg-primary text-primary-foreground"
							>
								<span className="sr-only">Page 1</span>
								<span>1</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0"
							>
								<span className="sr-only">Page 2</span>
								<span>2</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0"
							>
								<span className="sr-only">Page 3</span>
								<span>3</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0"
							>
								<span className="sr-only">Go to next page</span>
								<span>›</span>
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
