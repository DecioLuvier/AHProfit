import { Link } from "react-router-dom";
import type { ItemRow } from "@/shared/api/client";
import { QUALITY_COLORS } from "@/shared/lib/constants";
import { fmtGold, fmtPercent } from "@/shared/lib/format";
import type { DataTableColumn } from "@/ui/data-display/DataTable";
import { ItemIcon } from "@/ui/data-display/ItemIcon";
import { flipPercent } from "../model";

const TIER_COLOR: Record<number, string> = {
	1: "oklch(0.64 0.09 55)", // bronze
	2: "oklch(0.8 0.012 250)", // prata
	3: "oklch(0.82 0.13 90)", // ouro
};

/* Badges de tag em duas linhas fixas:
   linha 1 → raridade + tier de qualidade | linha 2 → Craftable / Reagent (pode ficar vazia). */
function ItemTags({ item }: { item: ItemRow }) {
	const qc = QUALITY_COLORS[item.quality] ?? "#9d9d9d";
	const tier = Number(item.quality_tier);
	const hasTier = tier >= 1 && tier <= 3;
	return (
		<div className="mkc-sub">
			<div className="mkc-sub-row">
				<span
					className="mkc-tag"
					style={{ color: qc, borderColor: `color-mix(in oklch, ${qc} 55%, transparent)` }}
				>
					{item.quality}
				</span>
				{hasTier ? (
					<span
						className="mkc-tag"
						style={{
							color: TIER_COLOR[tier],
							borderColor: `color-mix(in oklch, ${TIER_COLOR[tier]} 55%, transparent)`,
						}}
					>
						Tier {tier}
					</span>
				) : null}
			</div>
			<div className="mkc-sub-row">
				{item.is_craftable ? <span className="mkc-tag mkc-tag--craft">Craftable</span> : null}
				{item.is_reagent ? <span className="mkc-tag mkc-tag--reagent">Reagent</span> : null}
			</div>
		</div>
	);
}

/* Ícone + nome + tags juntos — mesmo bloco na tabela e no modo compacto.
   O ícone (40px) tem a altura do nome + as duas linhas de tags. */
function ItemIdentity({ item }: { item: ItemRow }) {
	return (
		<Link to={`/items/${item.id}`} className="mkc-id">
			<ItemIcon icon={item.icon} name={item.name} quality={item.quality} qualityTier={item.quality_tier} size={40} />
			<div style={{ minWidth: 0 }}>
				<div className="mkc-name">{item.name}</div>
				<ItemTags item={item} />
			</div>
		</Link>
	);
}

export const marketColumns: DataTableColumn<ItemRow>[] = [
	{
		key: "name",
		header: "Name",
		sortKey: "name",
		/* Ocupa também a largura da coluna "Tags": nome + tags moram juntos, mas o
		   cabeçalho "Tags" continua existindo e clicável (ordena por raridade). */
		colSpan: 2,
		width: "16%",
		render: (item) => <ItemIdentity item={item} />,
	},
	{
		key: "tags",
		header: "Tags",
		sortKey: "quality",
		align: "left",
		width: "14%",
		render: () => null,
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
	const margin = item.profit_margin_percent;
	const marginColor =
		margin == null ? "var(--text)" : margin >= 0 ? "var(--good)" : "var(--bad)";
	const flipActive = flip != null && flip !== 0;

	return (
		<div className="mkc">
			<ItemIdentity item={item} />
			<div className="mkc-right">
				<div className="mkc-metric">
					<span>Market</span>
					<b className="mkc-metric-price">{item.market_price != null ? fmtGold(item.market_price) : "—"}</b>
				</div>
				<div className="mkc-metric">
					<span>Flip %</span>
					<b style={{ color: flipActive ? "var(--good)" : "var(--text-dimmer)" }}>
						{flipActive ? fmtPercent(flip) : "—"}
					</b>
				</div>
				<div className="mkc-metric">
					<span>Craft cost</span>
					<b>{item.craft_cost != null ? fmtGold(item.craft_cost) : "—"}</b>
				</div>
				<div className="mkc-metric">
					<span>Margin</span>
					<b style={{ color: marginColor }}>{margin == null ? "—" : fmtPercent(margin)}</b>
				</div>
				<div className="mkc-metric">
					<span>Qty</span>
					<b>{item.group_volume ?? "—"}</b>
				</div>
			</div>
		</div>
	);
}
