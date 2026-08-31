import { Link } from "react-router-dom";
import type { ItemRow } from "@/shared/api/client";
import { QUALITY_COLORS } from "@/shared/lib/constants";
import { fmtGold, fmtPercent } from "@/shared/lib/format";
import type { DataTableColumn } from "@/ui/data-display/DataTable";
import { ItemIcon } from "@/ui/data-display/ItemIcon";
import { Tag } from "@/ui/data-display/Tag";
import { flipPercent } from "../model";

function TagStrip({ item, extraClass = false }: { item: ItemRow; extraClass?: boolean }) {
	return (
		<>
			<Tag label={item.quality} color={QUALITY_COLORS[item.quality] ?? "#9d9d9d"} />
			{item.is_craftable ? <Tag label="Craftable" color="var(--accent-strong)" /> : null}
			{item.is_reagent ? <Tag label="Reagent" color="var(--good)" /> : null}
			{extraClass && item.item_class && item.item_class !== "Unknown" ? (
				<Tag label={item.item_class} color="var(--text-dim)" />
			) : null}
		</>
	);
}

export const marketColumns: DataTableColumn<ItemRow>[] = [
	{
		key: "name",
		header: "Name",
		sortKey: "name",
		colSpan: 2,
		width: "14%",
		render: (item) => (
			<Link
				to={`/items/${item.id}`}
				style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, color: "inherit", textDecoration: "none" }}
			>
				<ItemIcon icon={item.icon} name={item.name} quality={item.quality} qualityTier={item.quality_tier} size={32} />
				<div style={{ minWidth: 0 }}>
					<div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
						<TagStrip item={item} />
					</div>
				</div>
			</Link>
		),
	},
	{
		key: "tags",
		header: "Tags",
		sortKey: "quality",
		align: "center",
		width: "16%",
		render: (item) => (
			<div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 150 }}>
				<TagStrip item={item} extraClass />
			</div>
		),
	},
	{
		key: "price",
		header: "Market price",
		align: "right",
		sortKey: "marketPrice",
		width: 130,
		render: (item) => (
			<span style={{ color: "var(--accent)", fontWeight: 600 }}>
				{item.market_price !== null ? fmtGold(item.market_price) : "—"}
			</span>
		),
	},
	{
		key: "flip",
		header: "Flip %",
		align: "right",
		sortKey: "flipPercent",
		width: 92,
		render: (item) => {
			const pct = flipPercent(item);
			if (pct === null || pct === 0) return "—";
			return (
				<span
					style={{ fontWeight: 600, color: "var(--good)" }}
					title={item.second_market_price != null ? `2nd: ${fmtGold(item.second_market_price)}` : undefined}
				>
					{fmtPercent(pct)}
				</span>
			);
		},
	},
	{
		key: "craftCost",
		header: "Craft cost",
		align: "right",
		sortKey: "craftCost",
		width: 120,
		render: (item) => (item.craft_cost !== null ? fmtGold(item.craft_cost) : "—"),
	},
	{
		key: "profitMarginPercent",
		header: "Margin",
		align: "right",
		sortKey: "profitMarginPercent",
		width: 96,
		render: (item) => fmtPercent(item.profit_margin_percent),
	},
	{
		key: "groupVolume",
		header: "Qty",
		align: "right",
		sortKey: "groupVolume",
		width: 68,
		render: (item) => item.group_volume ?? "—",
	},
];

export function MobileItemCard({ item }: { item: ItemRow }) {
	const flip = flipPercent(item);
	const qualityColor = QUALITY_COLORS[item.quality] ?? "#9d9d9d";
	return (
		<Link to={`/items/${item.id}`} className="mobile-item-card" style={{ borderLeftColor: qualityColor }}>
			<ItemIcon icon={item.icon} name={item.name} quality={item.quality} qualityTier={item.quality_tier} size={44} />
			<div className="mobile-item-main">
				<div className="mobile-item-heading">
					<strong>{item.name}</strong>
					<span className="mobile-item-price-block">
						<strong className="mobile-item-price">
							{item.market_price != null ? fmtGold(item.market_price) : "—"}
						</strong>
						<small>Qty {item.group_volume ?? "—"}</small>
					</span>
				</div>
				<div className="mobile-item-meta">
					<TagStrip item={item} />
				</div>
				<div className="mobile-item-stats">
					<span>
						Craft <b>{item.craft_cost != null ? fmtGold(item.craft_cost) : "—"}</b>
					</span>
					<span>
						Margin <b>{fmtPercent(item.profit_margin_percent)}</b>
					</span>
					<span style={{ color: flip == null || flip === 0 ? "var(--text-dimmer)" : "var(--good)" }}>
						Flip <b>{flip == null || flip === 0 ? "—" : fmtPercent(flip)}</b>
					</span>
				</div>
			</div>
		</Link>
	);
}
