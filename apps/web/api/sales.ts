import {} from "next";
import { prisma } from "../../../database/prisma";
import type { Sale } from "../../../types";

export const getSales = async (organizationSlug: string): Promise<Sale[]> => {
	return prisma.sale.findMany({
		where: { organization: { slug: organizationSlug } },
	});
};

export const deleteSale = async (saleId: string): Promise<void> => {
	await prisma.sale.delete({ where: { id: saleId } });
};
