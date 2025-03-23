"use client";
import { cn } from "@ui/lib";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

interface Breadcrumb {
	title: string;
	href: string;
}

interface PosPageHeaderProps {
	title: string;
	subtitle?: string;
	breadcrumbs?: Breadcrumb[];
	className?: string;
}

export function PosPageHeader({
	title,
	subtitle,
	breadcrumbs,
	className,
}: PosPageHeaderProps) {
	return (
		<div className={cn("mb-8 border-b pb-4", className)}>
			{breadcrumbs && (
				<nav className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
					{breadcrumbs.map((breadcrumb, index) => (
						<div
							key={breadcrumb.href}
							className="flex items-center gap-1"
						>
							<Link
								href={breadcrumb.href}
								className="hover:text-foreground transition-colors"
							>
								{breadcrumb.title}
							</Link>
							{index < breadcrumbs.length - 1 && (
								<ChevronRightIcon className="h-4 w-4" />
							)}
						</div>
					))}
				</nav>
			)}
			<h2 className="font-bold text-2xl lg:text-3xl">{title}</h2>
			{subtitle && <p className="mt-1 opacity-60">{subtitle}</p>}
		</div>
	);
}
