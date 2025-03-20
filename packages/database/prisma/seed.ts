import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	// Use upsert instead of create to handle existing records
	const organization = await prisma.organization.upsert({
		where: { id: "org_123" },
		update: {
			name: "Test Organization",
			slug: "test-org",
		},
		create: {
			id: "org_123",
			name: "Test Organization",
			slug: "test-org",
		},
	});

	// Delete existing roles for this organization to avoid duplicates
	await prisma.role.deleteMany({
		where: { organizationId: organization.id }
	});

	// Create new roles
	await prisma.role.createMany({
		data: [
			{
				id: "role_admin",
				organizationId: organization.id,
				name: "Admin",
				permissions: {
					dashboard: ["read"],
					reports: ["read"],
					settings: ["read", "write"],
					roles: ["read", "write"],
					employees: ["read", "write"],
					outlets: ["read", "write"],
					products: ["read", "write"],
					sales: ["read", "write"],
					inventory: ["read", "write"],
					customers: ["read", "write"],
					suppliers: ["read", "write"],
					accounting: ["read", "write"],
					attendance: ["read", "write"],
					expenses: ["read", "write"],
					installments: ["read", "write"],
					warranty: ["read", "write"],
				},
			},
			{
				id: "role_employee",
				organizationId: organization.id,
				name: "Employee",
				permissions: {
					sales: ["read", "write"],
					inventory: ["read"],
					customers: ["read", "write"],
					attendance: ["read", "write"],
				},
			},
			{
				id: "role_cashier",
				organizationId: organization.id,
				name: "Cashier",
				permissions: {
					sales: ["write"],
					customers: ["read"],
				},
			},
		],
	});

	console.log("Seed completed successfully");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
