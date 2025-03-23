"use client";
import type { StateCreator } from "zustand";
import { create } from "zustand";
import type { CartItem, CartStore, ProductWithStock } from "../lib/types";

type CartCreator = StateCreator<CartStore>;

const useCart = create<CartStore>((set, get) => ({
	items: [],
	addItem: (product: ProductWithStock) => {
		const items = get().items;
		const existingItem = items.find(
			(item: CartItem) => item.product.id === product.id,
		);

		if (existingItem) {
			set({
				items: items.map((item: CartItem) =>
					item.product.id === product.id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				),
			});
		} else {
			set({ items: [...items, { product, quantity: 1 }] });
		}
	},
	removeItem: (productId: string) => {
		set({
			items: get().items.filter(
				(item: CartItem) => item.product.id !== productId,
			),
		});
	},
	updateQuantity: (productId: string, quantity: number) => {
		if (quantity <= 0) {
			get().removeItem(productId);
			return;
		}

		set({
			items: get().items.map((item: CartItem) =>
				item.product.id === productId ? { ...item, quantity } : item,
			),
		});
	},
	clearCart: () => set({ items: [] }),
	get total() {
		return get().items.reduce(
			(sum: number, item: CartItem) =>
				sum + item.product.price * item.quantity,
			0,
		);
	},
}));

export { useCart };
