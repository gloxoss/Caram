"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../../../../../../../../modules/saas/shared/components/PageHeader";
import { useToast } from "../../../../../../../../modules/ui/components/use-toast";

interface Category {
	id: string;
	name: string;
}

interface Brand {
	id: string;
	name: string;
}

interface Unit {
	id: string;
	name: string;
}

interface Rack {
	id: string;
	name: string;
}

async function fetchCategories(organizationId: string) {
	const response = await fetch(
		"/api/category?organizationId=uFCEG2u6fXrpLehPKKPCY7FK51E1Juym",
	);
	if (!response.ok) {
		throw new Error("Failed to fetch categories");
	}
	return response.json();
}

async function fetchBrands(organizationId: string) {
	const response = await fetch(
		"/api/brand?organizationId=uFCEG2u6fXrpLehPKKPCY7FK51E1Juym",
	);
	if (!response.ok) {
		throw new Error("Failed to fetch brands");
	}
	return response.json();
}

async function fetchUnits(organizationId: string) {
	const response = await fetch(
		"/api/unit?organizationId=uFCEG2u6fXrpLehPKKPCY7FK51E1Juym",
	);
	if (!response.ok) {
		throw new Error("Failed to fetch units");
	}
	return response.json();
}

async function fetchRacks(organizationId: string) {
	const response = await fetch(
		"http://localhost:3000/api/rack?organizationId=uFCEG2u6fXrpLehPKKPCY7FK51E1Juym",
	);
	if (!response.ok) {
		throw new Error("Failed to fetch racks");
	}
	return response.json();
}

export default function AddProductPage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const organizationSlug = params.organizationSlug as string;

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		price: "",
		categoryId: "",
		brandId: "",
		unitId: "",
		rackId: "",
		image: "",
	});

	const { data: categoriesData } = useQuery({
		queryKey: ["categories", organizationSlug],
		queryFn: () => fetchCategories(organizationSlug),
	});

	const { data: brandsData } = useQuery({
		queryKey: ["brands", organizationSlug],
		queryFn: () => fetchBrands(organizationSlug),
	});

	const { data: unitsData } = useQuery({
		queryKey: ["units", organizationSlug],
		queryFn: () => fetchUnits(organizationSlug),
	});

	const { data: racksData } = useQuery({
		queryKey: ["racks", organizationSlug],
		queryFn: () => fetchRacks(organizationSlug),
	});

	const categories = categoriesData?.items || [];
	const brands = brandsData?.items || [];
	const units = unitsData?.items || [];
	const racks = racksData?.items || [];

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: name === "price" ? value.replace(/[^0-9.]/g, "") : value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/product", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					organizationId: organizationSlug,
					price: Number.parseFloat(formData.price) || 0,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create product");
			}

			toast({
				title: "Success",
				description: "Product created successfully",
			});

			router.push(`/app/${organizationSlug}/products/items/list`);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create product",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader
				title="Add New Product"
				/* 				description="Create a new product in your inventory"
				 */ /* actions={
					<Link href={`/app/${organizationSlug}/products/items/list`}>
						<Button variant="outline">
							<ArrowLeftIcon className="mr-2 h-4 w-4" />
							Back to Products
						</Button>
					</Link>
				} */
			/>

			<Card className="mx-auto max-w-3xl p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-4">
						<div>
							<Label htmlFor="name" className="text-base">
								Product Name *
							</Label>
							<Input
								id="name"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Enter product name"
								required
								className="mt-1"
							/>
						</div>

						<div>
							<Label htmlFor="description" className="text-base">
								Description
							</Label>
							<Textarea
								id="description"
								name="description"
								value={formData.description}
								onChange={handleChange}
								placeholder="Enter product description"
								className="mt-1"
								rows={4}
							/>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="price" className="text-base">
									Price *
								</Label>
								<div className="relative mt-1">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
										$
									</span>
									<Input
										id="price"
										name="price"
										value={formData.price}
										onChange={handleChange}
										placeholder="0.00"
										required
										className="pl-8"
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="image" className="text-base">
									Image URL
								</Label>
								<Input
									id="image"
									name="image"
									value={formData.image}
									onChange={handleChange}
									placeholder="https://example.com/image.jpg"
									className="mt-1"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<Label
									htmlFor="categoryId"
									className="text-base"
								>
									Category
								</Label>
								<select
									id="categoryId"
									name="categoryId"
									value={formData.categoryId}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="">Select a category</option>
									{categories.map((category: Category) => (
										<option
											key={category.id}
											value={category.id}
										>
											{category.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<Label htmlFor="brandId" className="text-base">
									Brand
								</Label>
								<select
									id="brandId"
									name="brandId"
									value={formData.brandId}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="">Select a brand</option>
									{brands.map((brand: Brand) => (
										<option key={brand.id} value={brand.id}>
											{brand.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="unitId" className="text-base">
									Unit
								</Label>
								<select
									id="unitId"
									name="unitId"
									value={formData.unitId}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="">Select a unit</option>
									{units.map((unit: Unit) => (
										<option key={unit.id} value={unit.id}>
											{unit.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<Label htmlFor="rackId" className="text-base">
									Rack
								</Label>
								<select
									id="rackId"
									name="rackId"
									value={formData.rackId}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="">Select a rack</option>
									{racks.map((rack: Rack) => (
										<option key={rack.id} value={rack.id}>
											{rack.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="flex justify-end space-x-2">
						<Link
							href={`/app/${organizationSlug}/products/items/list`}
						>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</Link>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Product"}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
