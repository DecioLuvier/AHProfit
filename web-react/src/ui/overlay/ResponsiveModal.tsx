import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { useIsMobile } from "@/shared/hooks";
import { cn } from "@/shared/lib/cn";

function ResponsiveModal(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="responsive-modal" {...props} />;
}

const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;

function Content({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
	const isMobile = useIsMobile();

	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay
				className={cn(
					"fixed inset-0 z-50 bg-black/40",
					"data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				)}
			/>
			<DialogPrimitive.Content
				data-slot="responsive-modal-content"
				data-variant={isMobile ? "sheet" : "dialog"}
				className={cn(
					"fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding p-5 text-sm text-popover-foreground shadow-lg",
					"transition duration-200 ease-in-out data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0",
					isMobile
						? "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t data-open:slide-in-from-bottom-10 data-closed:slide-out-to-bottom-10"
						: "top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border data-open:zoom-in-95 data-closed:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						aria-label="Close"
						className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<XIcon className="size-4" />
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

function Title({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title className={cn("font-heading text-base font-medium text-foreground", className)} {...props} />
	);
}

function Description({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

ResponsiveModal.Trigger = Trigger;
ResponsiveModal.Close = Close;
ResponsiveModal.Content = Content;
ResponsiveModal.Title = Title;
ResponsiveModal.Description = Description;

export { ResponsiveModal };
