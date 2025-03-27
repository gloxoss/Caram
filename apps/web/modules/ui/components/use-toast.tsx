"use client";

import { type ToastT, toast as sonnerToast } from "sonner";

type ToastProps = Omit<ToastT, "id"> & {
	title?: React.ReactNode;
	description?: React.ReactNode;
	action?: {
		label: string;
		onClick: () => void;
	};
	variant?: "default" | "destructive" | "success";
};

const useToast = () => {
	const toast = ({
		title,
		description,
		variant,
		action,
		...props
	}: ToastProps) => {
		const toastProps: ToastProps = {
			...props,
			classNames: {
				...(props.classNames || {}),
				...(variant === "destructive" && {
					error: "!text-destructive",
				}),
				...(variant === "success" && {
					success: "!text-success",
				}),
			},
		};

		return sonnerToast(title as string, {
			...toastProps,
			description,
			...(action && {
				action: {
					label: action.label,
					onClick: action.onClick,
				},
			}),
			...(variant === "destructive" && {
				style: { color: "var(--destructive)" },
			}),
			...(variant === "success" && {
				style: { color: "var(--success)" },
			}),
		});
	};

	return {
		toast,
		dismiss: sonnerToast.dismiss,
		error: (message: string, options?: Omit<ToastProps, "variant">) => {
			return toast({
				title: message,
				variant: "destructive",
				...options,
			});
		},
		success: (message: string, options?: Omit<ToastProps, "variant">) => {
			return toast({ title: message, variant: "success", ...options });
		},
		promise: sonnerToast.promise,
		loading: sonnerToast.loading,
		custom: sonnerToast.custom,
	};
};

export { useToast };
