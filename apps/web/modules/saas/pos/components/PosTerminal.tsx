"use client";
import { Card } from "@ui/components/card";
import { useProducts } from "../hooks/use-products";
import { CartSidebar } from "./CartSidebar";
import { CategoryFilter } from "./CategoryFilter";
import { ProductGrid } from "./ProductGrid";
import { SearchInput } from "./SearchInput";

export function PosTerminal() {
	const { products, isLoading } = useProducts();

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col gap-4 overflow-hidden">
			<div className="flex items-center gap-4">
				<SearchInput className="flex-1" />
				<CategoryFilter />
			</div>

			<div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
				<Card className="col-span-8 overflow-hidden">
					<ProductGrid
						products={products}
						isLoading={isLoading}
						className="h-full overflow-y-auto p-4"
					/>
				</Card>

				<Card className="col-span-4 overflow-hidden">
					<CartSidebar className="flex h-full flex-col overflow-hidden" />
				</Card>
			</div>
		</div>
	);
}
