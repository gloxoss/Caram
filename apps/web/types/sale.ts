export interface Sale {
	id: string;
	organizationId: string;
	outletId: string;
	userId: string;
	customerId: string | null;
	totalAmount: number;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}
