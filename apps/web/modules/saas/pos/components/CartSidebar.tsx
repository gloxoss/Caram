"use client";
import { Button } from "@ui/components/button";
import { ScrollArea } from "@ui/components/scroll-area";
import { cn } from "@ui/lib";
import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";

interface CartSidebarProps {
	className?: string;
}

export function CartSidebar({ className }: CartSidebarProps) {
	const { items, updateQuantity, removeItem, total } = useCart();

	return (
		<div className={cn("flex flex-col", className)}>
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h2 className="text-lg font-semibold">Shopping Cart</h2>
				<span className="text-sm text-muted-foreground">
					{items.length} {items.length === 1 ? "item" : "items"}
				</span>
			</div>

			<ScrollArea className="flex-1">
				<div className="divide-y">
					{items.map((item) => (
						<div key={item.product.id} className="flex gap-4 p-4">
							<div className="relative aspect-square h-16 w-16 overflow-hidden rounded-lg bg-muted">
								{item.product.image ? (
									<Image
										src={item.product.image}
										alt={item.product.name}
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center">
										<span className="text-2xl">📦</span>
									</div>
								)}
							</div>

							<div className="flex flex-1 flex-col">
								<h3 className="font-medium line-clamp-1">
									{item.product.name}
								</h3>
								<p className="text-sm text-muted-foreground">
									{formatCurrency(item.product.price)}
								</p>

								<div className="mt-2 flex items-center gap-2">
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() =>
											updateQuantity(
												item.product.id,
												item.quantity - 1,
											)
										}
									>
										<MinusIcon className="h-4 w-4" />
									</Button>
									<span className="w-8 text-center">
										{item.quantity}
									</span>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() =>
											updateQuantity(
												item.product.id,
												item.quantity + 1,
											)
										}
									>
										<PlusIcon className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 ml-auto text-destructive"
										onClick={() =>
											removeItem(item.product.id)
										}
									>
										<TrashIcon className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			</ScrollArea>

			<div className="border-t p-4">
				<div className="flex items-center justify-between text-lg font-semibold">
					<span>Total</span>
					<span>{formatCurrency(total)}</span>
				</div>
				<Button className="mt-4 w-full" size="lg">
					Checkout
				</Button>
			</div>
		</div>
	);
}
