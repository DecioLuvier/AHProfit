import { useEffect, useRef, useState } from "react";

type Props = {
	onConfirm: () => void;
	idleLabel: string;
	confirmLabel?: string;
	className?: string;
	timeout?: number;
	title?: string;
};

export function InlineConfirm({
	onConfirm,
	idleLabel,
	confirmLabel = "Confirm?",
	className,
	timeout = 3000,
	title,
}: Props) {
	const [armed, setArmed] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clear = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	};
	const disarm = () => {
		clear();
		setArmed(false);
	};

	useEffect(() => clear, []);

	return (
		<button
			type="button"
			title={title}
			className={className}
			data-armed={armed || undefined}
			aria-live="polite"
			onClick={() => {
				if (armed) {
					disarm();
					onConfirm();
				} else {
					setArmed(true);
					clear();
					timer.current = setTimeout(() => setArmed(false), timeout);
				}
			}}
			onMouseLeave={() => armed && disarm()}
			onBlur={() => armed && disarm()}
			onKeyDown={(e) => {
				if (e.key === "Escape" && armed) disarm();
			}}
		>
			{armed ? confirmLabel : idleLabel}
		</button>
	);
}
