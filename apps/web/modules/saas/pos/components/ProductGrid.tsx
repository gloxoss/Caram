"use client";
import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import Image from "next/image";
import { useCart } from "../hooks/use-cart";
import type { ProductWithStock } from "../lib/types";
import { formatCurrency } from "../lib/utils";

interface ProductGridProps {
	products: ProductWithStock[];
	isLoading?: boolean;
	className?: string;
}

export function ProductGrid({
	products,
	isLoading,
	className,
}: ProductGridProps) {
	const { addItem } = useCart();

	if (isLoading) {
		return (
			<div
				className={cn(
					"grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
					className,
				)}
			>
				{Array.from({ length: 8 }).map((_, i) => (
					<Card key={i} className="flex flex-col">
						<Skeleton className="aspect-square w-full rounded-t-lg" />
						<div className="p-4">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="mt-2 h-4 w-1/2" />
						</div>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
				className,
			)}
		>
			{products.map((product) => (
				<Card
					key={product.id}
					className="group flex cursor-pointer flex-col transition-transform hover:scale-105"
					onClick={() => addItem(product)}
				>
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
								<span className="text-2xl">📦</span>
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
					<div className="flex flex-col gap-1 p-4">
						<h3 className="font-medium line-clamp-1">
							{product.name}
						</h3>
						<p className="text-sm text-muted-foreground line-clamp-1">
							{product.description}
						</p>
						<div className="mt-1 flex items-center justify-between">
							<p className="font-semibold text-primary">
								{formatCurrency(product.price)}
							</p>
							<p className="text-sm text-muted-foreground">
								Stock: {product.totalStock}
							</p>
						</div>
					</div>
				</Card>
			))}
		</div>
	);
}
