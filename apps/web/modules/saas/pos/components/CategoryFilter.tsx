"use client";
import type { Category } from "@repo/database";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { cn } from "@ui/lib";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CategoryFilterProps {
	className?: string;
}

async function fetchCategories(organizationId: string) {
	const response = await fetch(
		`/api/category?organizationId=${organizationId}`,
	);
	if (!response.ok) {
		throw new Error("Failed to fetch categories");
	}
	return response.json();
}

export function CategoryFilter({ className }: CategoryFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { activeOrganization } = useActiveOrganization();

	const { data: categories = [] } = useQuery<Category[]>({
		queryKey: ["categories", activeOrganization?.id],
		queryFn: () => fetchCategories(activeOrganization?.id || ""),
		enabled: !!activeOrganization?.id,
	});

	const currentCategory = searchParams.get("category") || "";

	function onValueChange(value: string) {
		const params = new URLSearchParams(searchParams);
		if (value) {
			params.set("category", value);
		} else {
			params.delete("category");
		}
		router.replace(`${pathname}?${params.toString()}`);
	}

	return (
		<Select value={currentCategory} onValueChange={onValueChange}>
			<SelectTrigger className={cn("w-[180px]", className)}>
				<SelectValue placeholder="Select a category" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="">All Categories</SelectItem>
				{categories.map((category) => (
					<SelectItem key={category.id} value={category.id}>
						{category.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
