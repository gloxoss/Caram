import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";

export default function PosLoading() {
	return (
		<div className="space-y-4">
			<div className="mb-8 border-b pb-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="mt-1 h-4 w-64" />
			</div>

			<Card className="p-4">
				<div className="flex items-center gap-4 mb-4">
					<Skeleton className="h-10 flex-1" />
					<Skeleton className="h-10 w-[180px]" />
				</div>

				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-8">
						<div className="grid grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<Card key={i} className="flex flex-col">
									<Skeleton className="aspect-square w-full rounded-t-lg" />
									<div className="p-4">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="mt-2 h-4 w-1/2" />
									</div>
								</Card>
							))}
						</div>
					</div>

					<div className="col-span-4">
						<Card className="p-4">
							<Skeleton className="h-6 w-32 mb-4" />
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex gap-4">
										<Skeleton className="h-16 w-16 rounded-lg" />
										<div className="flex-1">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="mt-2 h-4 w-1/2" />
											<div className="mt-2 flex items-center gap-2">
												<Skeleton className="h-8 w-8" />
												<Skeleton className="h-8 w-8" />
												<Skeleton className="h-8 w-8" />
											</div>
										</div>
									</div>
								))}
							</div>
						</Card>
					</div>
				</div>
			</Card>
		</div>
	);
}
