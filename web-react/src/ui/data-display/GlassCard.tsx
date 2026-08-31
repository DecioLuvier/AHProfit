import type { CSSProperties, ReactNode } from "react";

interface GlassCardProps {
	children: ReactNode;
	p?: number;
	delay?: number;
	style?: CSSProperties;
	className?: string;
}

export function GlassCard({ children, p = 18, style, className }: GlassCardProps) {
	const baseStyle: CSSProperties = {
		background: "var(--panel)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		padding: p,
		boxSizing: "border-box",
	};
	return (
		<div style={{ ...baseStyle, ...style }} className={className}>
			{children}
		</div>
	);
}
