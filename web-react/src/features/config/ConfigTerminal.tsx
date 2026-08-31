import { useEffect, useRef } from "react";

export type TermLine = { text: string; tone?: "in" | "ok" | "err" | "sys" };

export function ConfigTerminal({ lines }: { lines: TermLine[] }) {
	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = bodyRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lines]);

	return (
		<section className="cfg-term">
			<div className="cfg-term-head">Stream log</div>
			<div className="cfg-term-body bagscroll" ref={bodyRef}>
				{lines.map((l, i) => (
					<div key={i} className={`cfg-term-line${l.tone ? ` is-${l.tone}` : ""}`}>
						{l.text}
					</div>
				))}
			</div>
		</section>
	);
}
