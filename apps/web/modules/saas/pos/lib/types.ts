import type { Product } from "@repo/database";

export interface ProductWithStock extends Product {
	totalStock: number;
	image?: string | null;
}

export interface CartItem {
	product: ProductWithStock;
	quantity: number;
}

export interface CartStore {
	items: CartItem[];
	addItem: (product: ProductWithStock) => void;
	removeItem: (productId: string) => void;
	updateQuantity: (productId: string, quantity: number) => void;
	clearCart: () => void;
	total: number;
}

export interface ProductsResponse {
	items: ProductWithStock[];
	count: number;
}
