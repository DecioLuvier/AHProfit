import { useState } from "react";
import type { BreakdownNode } from "@/shared/api/client";
import { fmtGold } from "@/shared/lib/format";
import { ItemIcon } from "@/ui/data-display/ItemIcon";

const DECISION_STYLE: Record<BreakdownNode["decision"], { label: string; color: string }> = {
	craft: { label: "Craft", color: "var(--accent-strong)" },
	buy: { label: "Buy", color: "var(--good)" },
	unresolved: { label: "Unknown", color: "var(--text-dim)" },
};

function BreakdownRow({ node, depth }: { node: BreakdownNode; depth: number }) {
	const [expanded, setExpanded] = useState(depth < 1);
	const hasChildren = node.children.length > 0;
	const style = DECISION_STYLE[node.decision];

	return (
		<div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					padding: "6px 4px",
					paddingLeft: depth * 20 + 4,
					cursor: hasChildren ? "pointer" : "default",
					borderRadius: 6,
				}}
				onClick={() => hasChildren && setExpanded((e) => !e)}
			>
				<span style={{ width: 12, flexShrink: 0, textAlign: "center", color: "var(--text-dimmer)", fontSize: 10 }}>
					{hasChildren ? (expanded ? "▾" : "▸") : ""}
				</span>
				<ItemIcon icon={node.icon} name={node.name} quality={node.quality} qualityTier={node.quality_tier} size={22} />
				<span
					style={{
						flex: 1,
						minWidth: 0,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						fontSize: 13,
					}}
				>
					{node.name} {node.quantity > 1 ? <span style={{ color: "var(--text-dim)" }}>×{node.quantity}</span> : null}
				</span>
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.03em",
						color: style.color,
						border: `1px solid ${style.color}`,
						borderRadius: 4,
						padding: "1px 6px",
						flexShrink: 0,
					}}
				>
					{style.label}
				</span>
				<span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 70, textAlign: "right", flexShrink: 0 }}>
					{node.totalCost != null ? fmtGold(node.totalCost) : "—"}
				</span>
			</div>
			{hasChildren &&
				expanded &&
				node.children.map((child, i) => <BreakdownRow key={`${child.itemId}-${i}`} node={child} depth={depth + 1} />)}
		</div>
	);
}

export function CraftPathTree({ tree }: { tree: BreakdownNode }) {
	return (
		<div style={{ width: "100%" }}>
			<BreakdownRow node={tree} depth={0} />
		</div>
	);
}
