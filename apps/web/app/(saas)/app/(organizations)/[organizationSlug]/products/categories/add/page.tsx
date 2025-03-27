"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { fetchCategoriesWithCurrentOrgPost } from "@saas/organizations/utils/get-current-organization";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "../../../../../../../../modules/saas/shared/components/PageHeader";

const formSchema = z.object({
	name: z.string().min(3, {
		message: "Name must be at least 3 characters",
	}),
	code: z.string().min(2, {
		message: "Code must be at least 2 characters",
	}),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddCategoryPage() {
	const params = useParams();
	const router = useRouter();
	const organizationSlug = params.organizationSlug as string;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			code: "",
		},
	});

	const onSubmit = async (values: FormValues) => {
		try {
			const response = await fetchCategoriesWithCurrentOrgPost(values);

			if (!response.ok) {
				throw new Error("Failed to create category");
			}

			toast.success("Category created successfully");
			router.push(`/app/${organizationSlug}/products/categories/list`);
		} catch (error) {
			console.error("Error creating category:", error);
			toast.error("Failed to create category");
		}
	};

	return (
		<div className="container mx-auto py-6">
			<PageHeader title="Add Category" />

			<Card className="mx-auto max-w-2xl">
				<div className="p-6">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Category Name</FormLabel>
										<FormControl>
											<Input
												placeholder="Enter category name"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Category Code</FormLabel>
										<FormControl>
											<Input
												placeholder="Enter category code"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push(
											`/app/${organizationSlug}/products/categories/list`,
										)
									}
								>
									Cancel
								</Button>
								<Button type="submit">Save Category</Button>
							</div>
						</form>
					</Form>
				</div>
			</Card>
		</div>
	);
}
