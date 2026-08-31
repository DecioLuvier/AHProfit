import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

export function HScroller({
	children,
	trackStyle,
	className,
}: {
	children: ReactNode;
	trackStyle?: CSSProperties;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [atStart, setAtStart] = useState(true);
	const [atEnd, setAtEnd] = useState(true);

	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		setAtStart(el.scrollLeft <= 1);
		setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		el.addEventListener("scroll", update, { passive: true });
		return () => {
			ro.disconnect();
			el.removeEventListener("scroll", update);
		};
	}, [update, children]);

	const nudge = (dir: 1 | -1) => {
		const el = ref.current;
		if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
	};

	const overflowing = !(atStart && atEnd);

	return (
		<div className={`hscroller${className ? ` ${className}` : ""}`}>
			<div ref={ref} className="hscroller-track" style={trackStyle}>
				{children}
			</div>
			{overflowing && (
				<>
					<button
						type="button"
						className="hscroller-arrow hscroller-arrow--left"
						aria-label="Scroll left"
						onClick={() => nudge(-1)}
						disabled={atStart}
					>
						‹
					</button>
					<button
						type="button"
						className="hscroller-arrow hscroller-arrow--right"
						aria-label="Scroll right"
						onClick={() => nudge(1)}
						disabled={atEnd}
					>
						›
					</button>
				</>
			)}
		</div>
	);
}
