import { QUALITY_COLORS } from "@/shared/lib/constants";

export function QualityBadge({ quality, qualityTier }: { quality: string; qualityTier?: number | string | null }) {
	const color = QUALITY_COLORS[quality] ?? "#9d9d9d";
	const tierNum = Number(qualityTier);
	const hasTier = tierNum >= 1 && tierNum <= 3;
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				padding: "2px 8px",
				borderRadius: 4,
				fontSize: 11,
				fontWeight: 700,
				letterSpacing: "0.03em",
				textTransform: "uppercase",
				color,
				border: `1px solid ${color}`,
				whiteSpace: "nowrap",
			}}
		>
			{hasTier && (
				<img
					src={`/icons/quality/tier${tierNum}.png`}
					alt={`Tier ${tierNum}`}
					width={18}
					height={18}
					style={{ objectFit: "contain", verticalAlign: "middle" }}
				/>
			)}
			{quality}
		</span>
	);
}

export function ItemTag({ label, color }: { label: string; color: string }) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				padding: "2px 8px",
				borderRadius: 4,
				fontSize: 11,
				fontWeight: 600,
				color,
				border: `1px solid ${color}`,
				whiteSpace: "nowrap",
			}}
		>
			{label}
		</span>
	);
}

interface CursorPaginationProps {
	nextCursor: string | null;
	canGoPrev: boolean;
	onNext: (cursor: string) => void;
	onPrev: () => void;
	rangeLabel?: string;
}

export function CursorPagination({ nextCursor, canGoPrev, onNext, onPrev, rangeLabel }: CursorPaginationProps) {
	const btnBase: React.CSSProperties = {
		padding: "6px 18px",
		borderRadius: 999,
		fontSize: 13,
		fontWeight: 600,
		cursor: "pointer",
		border: "1px solid var(--border-strong)",
		background: "oklch(0.14 0.02 260 / 0.6)",
		color: "var(--text)",
		transition: "filter 0.15s",
	};
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
			<button
				type="button"
				style={{ ...btnBase, opacity: canGoPrev ? 1 : 0.35, cursor: canGoPrev ? "pointer" : "not-allowed" }}
				onClick={onPrev}
				disabled={!canGoPrev}
			>
				← Previous
			</button>
			<button
				type="button"
				style={{
					...btnBase,
					background: nextCursor ? "var(--accent)" : "oklch(0.14 0.02 260 / 0.6)",
					color: nextCursor ? "oklch(0.14 0.02 260)" : "var(--text)",
					opacity: nextCursor ? 1 : 0.35,
					cursor: nextCursor ? "pointer" : "not-allowed",
				}}
				onClick={() => nextCursor && onNext(nextCursor)}
				disabled={!nextCursor}
			>
				Next →
			</button>
			{rangeLabel && <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{rangeLabel}</span>}
		</div>
	);
}

export function SkeletonLoader({ label = "Carregando…" }: { label?: string }) {
	return <p style={{ color: "var(--text-dim)", textAlign: "center", margin: 0, padding: "12px 4px" }}>{label}</p>;
}
