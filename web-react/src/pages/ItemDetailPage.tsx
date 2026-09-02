import { useQueries } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	itemBreakdownQuery,
	itemCraftingInfoQuery,
	itemDetailQuery,
	itemListingsQuery,
	priceHistoryQuery,
} from "@/features/items/api/queries";
import { CraftPathTree } from "@/features/items/CraftPathTree";
import type {
	ItemBreakdownResponse,
	ItemCraftingInfo,
	ItemDetail,
	ItemListingsResponse,
	PriceHistoryResponse,
} from "@/shared/api/client";
import { QUALITY_COLORS } from "@/shared/lib/constants";
import { fmtGold, fmtPercent } from "@/shared/lib/format";
import { RadarChart, RadarChartLegend } from "@/ui/charts/PriceHistoryChart";
import { Badge } from "@/ui/data-display/Badge";
import { GlassCard } from "@/ui/data-display/GlassCard";
import { HScroller } from "@/ui/data-display/HScroller";
import { ItemIcon } from "@/ui/data-display/ItemIcon";

const sectionHeadingStyle = {
	margin: 0,
	fontSize: 11.5,
	textTransform: "uppercase" as const,
	letterSpacing: "0.05em",
	color: "var(--accent-strong)",
	fontWeight: 700,
	whiteSpace: "nowrap" as const,
};
const emptyStyle = { color: "var(--text-dimmer)", fontSize: 12.5, margin: 0 };
const dividerStyle = { border: "none", borderTop: "1px solid var(--border-soft)", margin: 0 };
const boxStyle = {
	background: "var(--panel-inset)",
	border: "1px solid var(--border-soft)",
	borderRadius: 6,
	padding: 10,
	boxSizing: "border-box" as const,
};
const rowScrollStyle = {
	...boxStyle,
	minHeight: 90,
	minWidth: 0,
	display: "flex",
	flexWrap: "nowrap" as const,
	alignItems: "center" as const,
	gap: 10,
	overflowX: "auto" as const,
	overflowY: "hidden" as const,
};

function MetricBox({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div style={{ fontSize: 9.5, color: "var(--text-dimmer)", textTransform: "uppercase" }}>{label}</div>
			<div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
		</div>
	);
}

function ItemDetailShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="view-fill">
			<GlassCard
				className="item-detail-card"
				style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
			>
				{children}
			</GlassCard>
		</div>
	);
}

export function ItemDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const itemId = Number(id);

	const results = useQueries({
		queries: [
			itemDetailQuery(itemId),
			itemCraftingInfoQuery(itemId),
			priceHistoryQuery(itemId, "30"),
			priceHistoryQuery(itemId, "1"),
			priceHistoryQuery(itemId, "7"),
			itemBreakdownQuery(itemId),
			itemListingsQuery(itemId),
		],
	});

	const isLoading = results[0].isLoading;
	const isError = results[0].isError;
	const item = results[0].data as ItemDetail | undefined;
	const craftingInfo = (results[1].data as ItemCraftingInfo | null | undefined) ?? null;
	const history = (results[2].data as PriceHistoryResponse | null | undefined) ?? null;
	const historyDay = (results[3].data as PriceHistoryResponse | null | undefined) ?? null;
	const historyWeek = (results[4].data as PriceHistoryResponse | null | undefined) ?? null;
	const breakdown = (results[5].data as ItemBreakdownResponse | null | undefined) ?? null;
	const listings = (results[6].data as ItemListingsResponse | null | undefined)?.listings ?? [];

	if (isLoading)
		return (
			<ItemDetailShell>
				<p style={{ color: "var(--text-dim)", margin: 0 }}>Loading…</p>
			</ItemDetailShell>
		);
	if (isError || !item)
		return (
			<ItemDetailShell>
				<p style={{ color: "var(--text-dim)", margin: 0 }}>Item not found.</p>
			</ItemDetailShell>
		);

	const qualityColor = QUALITY_COLORS[item.quality] ?? "#9d9d9d";
	const chartData =
		history?.points
			.filter((p) => p.price != null)
			.map((p) => ({
				timestamp: p.timestamp,
				price: p.price as number,
				craftCost: item.craft_cost,
				volume: p.volume,
			})) ?? [];

	const craftTile = (
		r: { id: number; name: string; icon: string; quality?: string | null; quality_tier?: number | null },
		trailing: string,
		trailingColor: string,
		showPlus: boolean,
		i: number,
	) => (
		<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
			{showPlus && i > 0 && (
				<span style={{ color: "var(--text-dimmer)", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>+</span>
			)}
			<Link
				to={`/items/${r.id}`}
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 2,
					color: "inherit",
					textDecoration: "none",
					width: 60,
					flexShrink: 0,
				}}
			>
				<ItemIcon icon={r.icon} name={r.name} quality={r.quality} qualityTier={r.quality_tier} size={32} />
				<span
					style={{
						fontSize: 9.5,
						textAlign: "center",
						color: "var(--text-dim)",
						lineHeight: 1.2,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						maxWidth: 60,
					}}
				>
					{r.name}
				</span>
				<span style={{ fontSize: 10.5, fontWeight: 700, color: trailingColor }}>{trailing}</span>
			</Link>
		</div>
	);

	const reagentTile = (
		r: {
			id: number;
			name: string;
			icon: string;
			quality?: string | null;
			quality_tier?: number | null;
			quantity: number;
		},
		i: number,
	) => craftTile(r, `x${r.quantity}`, "var(--accent-strong)", true, i);
	const disenchantTile = (
		d: {
			id: number;
			name: string;
			icon: string;
			quality?: string | null;
			quality_tier?: number | null;
			chancePercent: number;
		},
		i: number,
	) => craftTile(d, `${d.chancePercent}%`, "var(--good)", false, i);

	const sectionCell = (title: string, content: React.ReactNode) => (
		<div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
			<h3 style={{ ...sectionHeadingStyle, marginBottom: 6 }}>{title}</h3>
			<HScroller trackStyle={rowScrollStyle}>{content}</HScroller>
		</div>
	);

	const infoRows: [string, React.ReactNode][] = [
		["Quality", <Badge key="q" quality={item.quality} qualityTier={item.quality_tier} />],
		["Expansion", item.expansion ?? "—"],
		["Slot", item.slot ?? "—"],
		["Item class", item.item_class ?? "—"],
		["Item subclass", item.item_subclass ?? "—"],
		["Volume", item.market_volume != null ? String(item.market_volume) : "—"],
		["Market price", item.market_price != null ? fmtGold(item.market_price) : "—"],
		["2nd cheapest", item.second_market_price != null ? fmtGold(item.second_market_price) : "—"],
		["3rd cheapest", item.third_market_price != null ? fmtGold(item.third_market_price) : "—"],
		["Craft cost", item.craft_cost != null ? fmtGold(item.craft_cost) : "—"],
		["Profit margin", item.profit_margin_percent != null ? fmtPercent(item.profit_margin_percent) : "—"],
		["Disenchant value", item.disenchant_value != null ? fmtGold(item.disenchant_value) : "—"],
		["Vendor sell price", item.sell_price != null ? fmtGold(item.sell_price) : "—"],
	];

	return (
		<div className="view-fill">
			<GlassCard
				className="item-detail-card"
				style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
					<button
						type="button"
						onClick={() => navigate(-1)}
						style={{
							padding: "4px 10px",
							borderRadius: 6,
							fontSize: 12,
							fontWeight: 600,
							border: "1px solid var(--border-strong)",
							background: "var(--panel-head-solid)",
							color: "var(--text-dim)",
							cursor: "pointer",
							flexShrink: 0,
						}}
					>
						←
					</button>
					<ItemIcon
						icon={item.icon}
						name={item.name}
						quality={item.quality}
						qualityTier={item.quality_tier}
						size={48}
					/>
					<div>
						<h2
							style={{
								margin: 0,
								fontFamily: "var(--font-display)",
								fontWeight: 700,
								fontSize: 21,
								letterSpacing: "0.02em",
							}}
						>
							{item.name}
						</h2>
						<div style={{ display: "flex", gap: 6, marginTop: 4 }}>
							<a
								href={`https://www.wowhead.com/item=${itemId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="badge-link"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 4,
									padding: "3px 10px",
									borderRadius: 5,
									fontSize: 10.5,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.03em",
									color: "#ffb100",
									border: "1px solid #ffb100",
									background: "#ffb1001a",
									textDecoration: "none",
									cursor: "pointer",
								}}
							>
								Wowhead{" "}
								<span aria-hidden style={{ fontSize: 10 }}>
									↗
								</span>
							</a>
							<a
								href={`https://undermine.exchange/#us-azralon/${itemId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="badge-link"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 4,
									padding: "3px 10px",
									borderRadius: 5,
									fontSize: 10.5,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.03em",
									color: "var(--accent-strong)",
									border: "1px solid var(--accent-strong)",
									background: "color-mix(in oklch, var(--accent-strong) 12%, transparent)",
									textDecoration: "none",
									cursor: "pointer",
								}}
							>
								Undermine{" "}
								<span aria-hidden style={{ fontSize: 10 }}>
									↗
								</span>
							</a>
						</div>
					</div>
				</div>

				<hr style={{ ...dividerStyle, margin: "16px 0" }} />

				<div
					className="item-detail-body"
					style={{
						display: "grid",
						gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
						gap: "0 28px",
						flex: 1,
						minHeight: 0,
						overflow: "hidden",
					}}
				>
					<div
						className="item-detail-left"
						style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, minHeight: 0, maxHeight: "100%" }}
					>
						{sectionCell(
							"Item Variants",
							craftingInfo && craftingInfo.variants.length > 0 ? (
								craftingInfo.variants.map((v, i) => {
									const vColor = QUALITY_COLORS[v.quality] ?? "#9d9d9d";
									return (
										<div key={i}>
											<Link
												to={`/items/${v.id}`}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													textDecoration: "none",
													color: "inherit",
													border: `1px solid ${vColor}`,
													borderRadius: 7,
													padding: "6px 12px",
													background: `${vColor}1a`,
													flexShrink: 0,
												}}
											>
												<ItemIcon
													icon={v.icon}
													name={v.name}
													quality={v.quality}
													qualityTier={v.quality_tier}
													size={24}
												/>
												<div style={{ display: "flex", flexDirection: "column" }}>
													<span style={{ fontSize: 11.5, fontWeight: 700, color: vColor }}>{v.quality}</span>
													<span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
														{v.marketPrice != null ? fmtGold(v.marketPrice) : "—"}
													</span>
												</div>
											</Link>
										</div>
									);
								})
							) : (
								<span style={emptyStyle}>One of a kind — no other quality variants.</span>
							),
						)}

						<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
							{sectionCell(
								"Crafting Reagents",
								craftingInfo && craftingInfo.crafting.length > 0 ? (
									craftingInfo.crafting.map((r, i) => <span key={`craft-${r.id}-${i}`}>{reagentTile(r, i)}</span>)
								) : (
									<span style={emptyStyle}>Not craftable.</span>
								),
							)}
							{sectionCell(
								"Used to Craft",
								craftingInfo && craftingInfo.usedAsReagentIn.length > 0 ? (
									craftingInfo.usedAsReagentIn.map((r, i) => <span key={`used-${r.id}-${i}`}>{reagentTile(r, i)}</span>)
								) : (
									<span style={emptyStyle}>Not used in any recipe.</span>
								),
							)}
							{sectionCell(
								"Disenchanting",
								craftingInfo && craftingInfo.disenchanting.length > 0 ? (
									craftingInfo.disenchanting.map((d, i) => (
										<span key={`disenchant-${d.id}-${i}`}>{disenchantTile(d, i)}</span>
									))
								) : (
									<span style={emptyStyle}>Can't be disenchanted.</span>
								),
							)}
							{sectionCell(
								"Obtainable From",
								<div
									style={{
										width: "100%",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										gap: 3,
										textAlign: "center",
									}}
								>
									<div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>
										Coming soon
									</div>
									<div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
										Vendor/drop/quest sources aren't tracked yet.
									</div>
								</div>,
							)}
						</div>

						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
							<h3 style={sectionHeadingStyle}>Best Craft Path</h3>
							{breakdown?.roiPercent != null && breakdown.tree.decision === "craft" && (
								<span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-strong)" }}>
									{fmtPercent(breakdown.roiPercent)} ROI
								</span>
							)}
						</div>
						<div style={{ ...boxStyle, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flexShrink: 0 }}>
								<MetricBox
									label="Sell net"
									value={
										breakdown?.tree.decision === "craft" && breakdown.sellNet != null ? fmtGold(breakdown.sellNet) : "—"
									}
								/>
								<MetricBox
									label="Profit"
									value={
										breakdown?.tree.decision === "craft" && breakdown.profitAbsolute != null
											? fmtGold(breakdown.profitAbsolute)
											: "—"
									}
								/>
								<MetricBox
									label="ROI"
									value={
										breakdown?.tree.decision === "craft" && breakdown.roiPercent != null
											? fmtPercent(breakdown.roiPercent)
											: "—"
									}
								/>
							</div>
							<hr style={{ ...dividerStyle, margin: 0, flexShrink: 0 }} />
							<div
								style={{
									flex: 1,
									display: "flex",
									alignItems: breakdown?.tree.decision === "craft" ? "stretch" : "center",
									justifyContent: breakdown?.tree.decision === "craft" ? "stretch" : "center",
								}}
							>
								{breakdown?.tree.decision === "craft" ? (
									<CraftPathTree tree={breakdown.tree} />
								) : (
									<span style={emptyStyle}>Not craftable — buying on the AH is the only path.</span>
								)}
							</div>
						</div>
					</div>

					<div
						className="item-detail-right"
						style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, minHeight: 0, maxHeight: "100%" }}
					>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", flex: 1, minHeight: 0 }}>
							<div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
								<h3 style={{ ...sectionHeadingStyle, marginBottom: 6 }}>Item Information</h3>
								<div
									style={{
										...boxStyle,
										padding: 0,
										display: "flex",
										flexDirection: "column",
										fontSize: 13,
										overflowY: "auto",
										minHeight: 0,
										flex: 1,
									}}
								>
									{infoRows.map(([label, value], i) => (
										<div
											key={i}
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												padding: "7px 10px",
												borderTop: i > 0 ? "1px solid var(--border-soft)" : "none",
												gap: 8,
											}}
										>
											<span style={{ color: "var(--text-dim)" }}>{label}</span>
											<span style={{ fontWeight: 600 }}>{value}</span>
										</div>
									))}
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
								<div
									style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}
								>
									<h3 style={sectionHeadingStyle}>Current Listings</h3>
									<span style={{ fontSize: 11, color: "var(--text-dim)" }}>{listings.length}</span>
								</div>
								<div style={{ ...boxStyle, padding: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
									{listings.length === 0 ? (
										<p style={{ ...emptyStyle, padding: 10 }}>No active listings.</p>
									) : (
										listings.map((l, i) => (
											<div
												key={i}
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													gap: 8,
													padding: "6px 10px",
													borderTop: i > 0 ? "1px solid var(--border-soft)" : "none",
													fontSize: 12,
												}}
											>
												<span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{l.count}×</span>
												<span style={{ fontWeight: 700, color: i === 0 ? "var(--good)" : "inherit" }}>
													{fmtGold(l.unit_price)}
													<span style={{ color: "var(--text-dimmer)", fontWeight: 400 }}>/ea</span>
												</span>
												<span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{fmtGold(l.buyout_price)}</span>
											</div>
										))
									)}
								</div>
							</div>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
								<h3 style={sectionHeadingStyle}>Price & Supply</h3>
								<span style={{ fontSize: 11, color: "var(--text-dim)" }}>30d</span>
							</div>
							<div
								style={{
									...boxStyle,
									flex: 1,
									display: "flex",
									flexDirection: "column",
									gap: 10,
									overflow: "hidden",
									minHeight: 0,
								}}
							>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flexShrink: 0 }}>
									<MetricBox
										label="Day avg"
										value={historyDay?.avgPrice != null ? fmtGold(historyDay.avgPrice) : "—"}
									/>
									<MetricBox
										label="Week avg"
										value={historyWeek?.avgPrice != null ? fmtGold(historyWeek.avgPrice) : "—"}
									/>
									<MetricBox label="Month avg" value={history?.avgPrice != null ? fmtGold(history.avgPrice) : "—"} />
								</div>
								<hr style={{ ...dividerStyle, margin: 0, flexShrink: 0 }} />
								{history && history.points.length > 0 ? (
									<div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
										<RadarChart data={chartData} hasCraftCost={item.craft_cost != null} height="100%" />
										<RadarChartLegend hasCraftCost={item.craft_cost != null} />
									</div>
								) : (
									<p style={emptyStyle}>No auction history for this item.</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
