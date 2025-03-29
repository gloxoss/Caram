"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Outlet {
	id: string;
	name: string;
	location?: string;
	phone?: string;
	email?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	isMain: boolean;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export default function OutletsPage() {
	const router = useRouter();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [outlets, setOutlets] = useState<Outlet[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchOutlets = async () => {
			if (!organizationId) return;
			setLoading(true);
			try {
				const response = await fetch(
					`/api/outlets?organizationId=${organizationId}`,
				);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch outlets: ${response.status}`,
					);
				}
				const data = await response.json();
				setOutlets(data);
			} catch (error: any) {
				setError(error.message || "Failed to fetch outlets");
			} finally {
				setLoading(false);
			}
		};

		fetchOutlets();
	}, [organizationId]);

	const handleAddOutlet = () => {
		router.push(`/app/${organizationSlug}/outlets/add`);
	};

	const handleEditOutlet = (outletId: string) => {
		router.push(`/app/${organizationSlug}/outlets/edit/${outletId}`);
	};

	const handleDeleteOutlet = async (outletId: string) => {
		if (!organizationId) return;
		try {
			const response = await fetch(
				`/api/outlets/${outletId}?organizationId=${organizationId}`,
				{
					method: "DELETE",
				},
			);
			if (!response.ok) {
				throw new Error(`Failed to delete outlet: ${response.status}`);
			}
			setOutlets(outlets.filter((outlet) => outlet.id !== outletId));
			toast.success("Outlet deleted successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to delete outlet");
		}
	};

	if (loading) {
		return <div>Loading outlets...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Outlets" />
			<div className="flex justify-end mb-4">
				<Button onClick={handleAddOutlet}>Add Outlet</Button>
			</div>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Name
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Location
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Phone
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Email
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{outlets.map((outlet) => (
							<tr key={outlet.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{outlet.name}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{outlet.location}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{outlet.phone}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{outlet.email}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<Button
										size="sm"
										onClick={() =>
											handleEditOutlet(outlet.id)
										}
									>
										Edit
									</Button>
									<Button
										size="sm"
										variant="error"
										onClick={() =>
											handleDeleteOutlet(outlet.id)
										}
									>
										Delete
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
