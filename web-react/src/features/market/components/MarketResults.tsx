import { ArrowDownUp, SlidersHorizontal } from "lucide-react";
import type { CSSProperties } from "react";
import { CursorPagination } from "@/ui/data-display/CursorPagination";
import { DataTable } from "@/ui/data-display/DataTable";
import { GlassCard } from "@/ui/data-display/GlassCard";
import type { useMarketTable } from "../hooks/useMarketTable";
import { MobileItemCard, marketColumns } from "./MarketColumns";

function SkeletonRow() {
	return (
		<tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
			<td colSpan={7} style={{ padding: "9px 10px" }}>
				<div
					className="animate-pulse"
					style={{ height: 32, borderRadius: 4, background: "oklch(0.15 0.02 260 / 0.7)" }}
				/>
			</td>
		</tr>
	);
}

type Vm = ReturnType<typeof useMarketTable>;

const compactBtnStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
	flex: "0 0 auto",
	height: 35,
	padding: "0 10px",
	border: "1px solid var(--border-strong)",
	borderRadius: 6,
	background: "var(--panel-solid)",
	color: "var(--text)",
	fontSize: 12,
	fontWeight: 700,
	cursor: "pointer",
};

const sortRowStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 7,
	padding: "2px 2px",
	color: "var(--text-dimmer)",
	fontSize: 11,
};

const sortSelectStyle: CSSProperties = {
	minWidth: 0,
	flex: 1,
	height: 30,
	padding: "0 8px",
	border: "1px solid var(--border-strong)",
	borderRadius: 6,
	background: "var(--panel-solid)",
	color: "var(--text)",
	font: "inherit",
};

export function MarketResults({ vm, compact, onOpenFilters }: { vm: Vm; compact: boolean; onOpenFilters: () => void }) {
	const { items, isInitialLoading, sortBy, sortDir, handleSort, prefetchItem, pagination } = vm;

	return (
		<GlassCard
			p={0}
			className="market-results-card"
			style={{
				flex: 1,
				minWidth: 0,
				minHeight: 0,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					height: compact ? undefined : 44,
					boxSizing: "border-box",
					padding: compact ? 12 : "0 16px",
					borderBottom: "1px solid var(--border-soft)",
					display: compact ? "grid" : "flex",
					gridTemplateColumns: compact ? "minmax(0, 1fr)" : undefined,
					alignItems: "center",
					justifyContent: compact ? undefined : "space-between",
					flexShrink: 0,
					gap: compact ? 9 : 12,
				}}
			>
				{!compact && (
					<div
						style={{
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: "0.06em",
							textTransform: "uppercase",
							color: "var(--accent-strong)",
							whiteSpace: "nowrap",
						}}
					>
						Auction House
					</div>
				)}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						width: "100%",
						minWidth: 0,
						justifyContent: compact ? undefined : "flex-end",
					}}
				>
					<input
						type="text"
						placeholder="Search by item name…"
						value={vm.search}
						onChange={(e) => vm.setSearch(e.currentTarget.value)}
						style={{ maxWidth: compact ? undefined : 260, width: "100%", minWidth: 0 }}
					/>
					{compact && (
						<button type="button" onClick={onOpenFilters} style={compactBtnStyle}>
							<SlidersHorizontal size={15} /> Filters
						</button>
					)}
				</div>
				{compact && (
					<div style={sortRowStyle}>
						<ArrowDownUp size={14} />
						<label htmlFor="mobile-sort">Sort by</label>
						<select
							id="mobile-sort"
							value={sortBy}
							onChange={(e) => e.currentTarget.value && handleSort(e.currentTarget.value)}
							style={sortSelectStyle}
						>
							<option value="">Default</option>
							<option value="name">Name</option>
							<option value="marketPrice">Market price</option>
							<option value="craftCost">Craft cost</option>
							<option value="flipPercent">Flip %</option>
							<option value="profitMarginPercent">Margin</option>
							<option value="groupVolume">Quantity</option>
						</select>
					</div>
				)}
			</div>

			<div
				style={{
					padding: "12px 12px 0",
					flex: 1,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					minWidth: 0,
					overflow: "hidden",
				}}
			>
				{isInitialLoading ? (
					<div style={{ flex: 1, minHeight: 0, overflowY: "hidden" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<tbody>
								{Array.from({ length: 10 }).map((_, i) => (
									<SkeletonRow key={i} />
								))}
							</tbody>
						</table>
					</div>
				) : compact ? (
					<div
						style={{
							display: "flex",
							flex: "1 1 auto",
							minHeight: 0,
							flexDirection: "column",
							overflowY: "auto",
							overflowX: "hidden",
						}}
					>
						{items.map((item) => (
							<MobileItemCard key={item.id} item={item} />
						))}
					</div>
				) : (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							minHeight: 0,
							minWidth: 0,
							overflowX: "hidden",
						}}
					>
						<DataTable
							columns={marketColumns}
							rows={items}
							getRowKey={(item) => item.id}
							sortBy={sortBy}
							sortDir={sortDir}
							onSort={handleSort}
							onRowHover={(item) => prefetchItem(item.id)}
						/>
					</div>
				)}
			</div>

			<div style={{ flexShrink: 0, padding: 12 }}>
				<CursorPagination
					nextCursor={pagination.nextCursor}
					canGoPrev={pagination.canGoPrev}
					onNext={pagination.onNext}
					onPrev={pagination.onPrev}
					rangeLabel={pagination.rangeLabel}
				/>
			</div>
		</GlassCard>
	);
}
