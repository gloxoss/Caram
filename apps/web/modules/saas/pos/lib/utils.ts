export function formatCurrency(amount: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);
}

export function parseCurrency(value: string): number {
	// Remove currency symbol and any non-numeric characters except decimal point
	const numericValue = value.replace(/[^0-9.]/g, "");
	return Number.parseFloat(numericValue);
}

export function calculateTotal(
	items: { price: number; quantity: number }[],
): number {
	return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatPercentage(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "percent",
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(value / 100);
}
