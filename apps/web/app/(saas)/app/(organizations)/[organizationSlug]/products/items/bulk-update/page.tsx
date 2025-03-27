"use client";

import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { FileUpIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../../../../../../../../modules/saas/shared/components/PageHeader";
import { useToast } from "../../../../../../../../modules/ui/components/use-toast";

export default function BulkUpdateProductsPage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const organizationSlug = params.organizationSlug as string;

	const [isUploading, setIsUploading] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			setFile(e.target.files[0]);
		}
	};

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return;

		setIsUploading(true);
		setUploadProgress(0);

		// Simulate progress
		const progressInterval = setInterval(() => {
			setUploadProgress((prev) => {
				if (prev >= 95) {
					clearInterval(progressInterval);
					return prev;
				}
				return prev + 5;
			});
		}, 200);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("organizationId", organizationSlug);

			const response = await fetch("/api/product/bulk", {
				method: "POST",
				body: formData,
			});

			clearInterval(progressInterval);
			setUploadProgress(100);

			if (!response.ok) {
				throw new Error("Failed to upload products");
			}

			const data = await response.json();

			toast({
				title: "Success",
				description: `${data.count} products uploaded successfully`,
			});

			setTimeout(() => {
				router.push(`/app/${organizationSlug}/products/items/list`);
			}, 1000);
		} catch (error) {
			clearInterval(progressInterval);
			toast({
				title: "Error",
				description: "Failed to upload products",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader
				title="Bulk Update Products"
				/* description="Upload a CSV or JSON file to add or update multiple products at once"
				actions={
					<Link href={`/app/${organizationSlug}/products/items/list`}>
						<Button variant="outline">
							<ArrowLeftIcon className="mr-2 h-4 w-4" />
							Back to Products
						</Button>
					</Link>
				} */
			/>

			<Card className="mx-auto max-w-3xl p-6">
				<form onSubmit={handleUpload} className="space-y-6">
					<div className="space-y-4">
						<div>
							<Label htmlFor="file" className="text-base">
								Upload File
							</Label>
							<div className="mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-6">
								<div className="flex flex-col items-center justify-center space-y-2">
									<div className="rounded-full bg-primary/10 p-3">
										<FileUpIcon className="h-6 w-6 text-primary" />
									</div>
									<div className="text-center">
										<p className="text-sm font-medium">
											{file
												? file.name
												: "Drag and drop or click to upload"}
										</p>
										<p className="text-xs text-muted-foreground">
											Supported formats: CSV, JSON (max
											10MB)
										</p>
									</div>
									<Input
										id="file"
										type="file"
										accept=".csv,.json"
										onChange={handleFileChange}
										className="hidden"
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											document
												.getElementById("file")
												?.click()
										}
									>
										Select File
									</Button>
								</div>
							</div>
						</div>

						{file && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{isUploading
											? "Uploading..."
											: "Ready to upload"}
									</span>
									<span className="text-sm text-muted-foreground">
										{uploadProgress}%
									</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
									<div
										className="h-full bg-primary transition-all duration-300 ease-in-out"
										style={{ width: `${uploadProgress}%` }}
									>
										t
									</div>
								</div>
							</div>
						)}

						<div className="rounded-lg border p-4">
							<h3 className="mb-2 text-sm font-medium">
								File Format Guidelines
							</h3>
							<ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
								<li>
									CSV file must have headers matching product
									fields
								</li>
								<li>
									Required columns: name, price (other fields
									are optional)
								</li>
								<li>
									JSON file must be an array of product
									objects with required fields
								</li>
								<li>
									To update existing products, include the
									product ID in the file
								</li>
							</ul>
						</div>

						<div className="flex items-center space-x-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => {
									// Download sample template
									const sampleCsv =
										"name,description,price,categoryId,brandId,unitId,rackId\nSample Product,Product description,99.99,category_id,brand_id,unit_id,rack_id";
									const blob = new Blob([sampleCsv], {
										type: "text/csv",
									});
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = "product_template.csv";
									document.body.appendChild(a);
									a.click();
									document.body.removeChild(a);
									URL.revokeObjectURL(url);
								}}
							>
								Download CSV Template
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => {
									// Download sample template
									const sampleJson = [
										{
											name: "Sample Product",
											description: "Product description",
											price: 99.99,
											categoryId: "category_id",
											brandId: "brand_id",
											unitId: "unit_id",
											rackId: "rack_id",
										},
									];
									const blob = new Blob(
										[JSON.stringify(sampleJson, null, 2)],
										{
											type: "application/json",
										},
									);
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = "product_template.json";
									document.body.appendChild(a);
									a.click();
									document.body.removeChild(a);
									URL.revokeObjectURL(url);
								}}
							>
								Download JSON Template
							</Button>
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
						<Button
							type="submit"
							disabled={!file || isUploading}
							className="flex items-center"
						>
							{isUploading ? (
								"Uploading..."
							) : (
								<>
									<UploadIcon className="mr-2 h-4 w-4" />
									Upload Products
								</>
							)}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
