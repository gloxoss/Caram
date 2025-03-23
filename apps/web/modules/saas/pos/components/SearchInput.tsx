"use client";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDebounce } from "../lib/hooks";

interface SearchInputProps {
	className?: string;
}

export function SearchInput({ className }: SearchInputProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentSearch = searchParams.get("search") || "";

	const debouncedCallback = useDebounce((value: string) => {
		const params = new URLSearchParams(searchParams);
		if (value) {
			params.set("search", value);
		} else {
			params.delete("search");
		}
		startTransition(() => {
			router.replace(`${pathname}?${params.toString()}`);
		});
	}, 300);

	return (
		<div className={cn("relative", className)}>
			<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search products..."
				className="pl-9"
				defaultValue={currentSearch}
				onChange={(e) => debouncedCallback(e.target.value)}
			/>
			{isPending && (
				<div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
					<div className="h-full w-full animate-spin rounded-full border-2 border-primary border-r-transparent" />
				</div>
			)}
		</div>
	);
}
