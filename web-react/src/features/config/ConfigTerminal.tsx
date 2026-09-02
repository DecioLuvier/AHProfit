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
			<div className="cfg-term-head">
				<span>Stream log</span>
				{lines.length > 0 && <span className="cfg-term-count">{lines.length}</span>}
			</div>
			<div className="cfg-term-body bagscroll" ref={bodyRef}>
				{lines.length === 0 ? (
					<div className="cfg-term-empty">
						<span className="cfg-term-empty-mark">{"</>"}</span>
						<p>No activity yet.</p>
						<p className="cfg-term-empty-sub">Import a dataset and its progress shows up here, line by line.</p>
					</div>
				) : (
					lines.map((l, i) => (
						<div key={i} className={`cfg-term-line${l.tone ? ` is-${l.tone}` : ""}`}>
							{l.text}
						</div>
					))
				)}
			</div>
		</section>
	);
}
