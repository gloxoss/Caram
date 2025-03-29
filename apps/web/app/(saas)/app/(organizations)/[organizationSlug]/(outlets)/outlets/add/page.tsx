"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface FormData {
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
}

export default function AddOutletPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();

	const organizationId = activeOrganization?.id;

	const [formData, setFormData] = useState<FormData>({
		name: "",
		location: "",
		phone: "",
		email: "",
		address: "",
		city: "",
		state: "",
		zipCode: "",
		country: "",
		isMain: false,
		notes: "",
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value, type } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]:
				type === "checkbox"
					? (e.target as HTMLInputElement).checked
					: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch("/api/outlets", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...formData, organizationId }),
			});

			if (!response.ok) {
				throw new Error("Failed to create outlet");
			}

			toast.success("Outlet created successfully");
			router.push(`/app/${organizationSlug}/outlets`);
		} catch (error: any) {
			toast.error(error.message || "Failed to create outlet");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Outlet" />

			<Card>
				<div className="p-4">
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4"
					>
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700"
							>
								Name
							</label>
							<Input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div>
							<label
								htmlFor="location"
								className="block text-sm font-medium text-gray-700"
							>
								Location
							</label>
							<Input
								type="text"
								id="location"
								name="location"
								value={formData.location || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700"
							>
								Phone
							</label>
							<Input
								type="text"
								id="phone"
								name="phone"
								value={formData.phone || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email
							</label>
							<Input
								type="email"
								id="email"
								name="email"
								value={formData.email || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="address"
								className="block text-sm font-medium text-gray-700"
							>
								Address
							</label>
							<Input
								type="text"
								id="address"
								name="address"
								value={formData.address || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="city"
								className="block text-sm font-medium text-gray-700"
							>
								City
							</label>
							<Input
								type="text"
								id="city"
								name="city"
								value={formData.city || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="state"
								className="block text-sm font-medium text-gray-700"
							>
								State
							</label>
							<Input
								type="text"
								id="state"
								name="state"
								value={formData.state || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="zipCode"
								className="block text-sm font-medium text-gray-700"
							>
								Zip Code
							</label>
							<Input
								type="text"
								id="zipCode"
								name="zipCode"
								value={formData.zipCode || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="country"
								className="block text-sm font-medium text-gray-700"
							>
								Country
							</label>
							<Input
								type="text"
								id="country"
								name="country"
								value={formData.country || ""}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="isMain"
								className="inline-flex items-center"
							>
								<Input
									type="checkbox"
									id="isMain"
									name="isMain"
									checked={formData.isMain}
									onChange={handleInputChange}
									className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
								/>
								<span className="ml-2 text-sm text-gray-700">
									Main Outlet
								</span>
							</label>
						</div>
						<div>
							<label
								htmlFor="notes"
								className="block text-sm font-medium text-gray-700"
							>
								Notes
							</label>
							<Input
								type="text"
								id="notes"
								name="notes"
								value={formData.notes || ""}
								onChange={handleInputChange}
							/>
						</div>

						<Button type="submit">Add Outlet</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
