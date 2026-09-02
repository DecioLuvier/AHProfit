import { SlidersHorizontal } from "lucide-react";
import { CursorPagination } from "@/ui/data-display/CursorPagination";
import { DataTable } from "@/ui/data-display/DataTable";
import { GlassCard } from "@/ui/data-display/GlassCard";
import type { useMarketTable } from "../hooks/useMarketTable";
import { MobileItemCard, marketColumns } from "./MarketColumns";

export type MarketLayout = "full" | "wide" | "compact";

function SkeletonRow() {
	return (
		<tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
			<td colSpan={7} style={{ padding: "9px 10px" }}>
				<div
					className="animate-pulse"
					style={{ height: 32, borderRadius: 4, background: "oklch(0.26 0.014 275 / 0.7)" }}
				/>
			</td>
		</tr>
	);
}

type Vm = ReturnType<typeof useMarketTable>;

const SORT_OPTIONS: { value: string; label: string }[] = [
	{ value: "", label: "Sort: Default" },
	{ value: "name", label: "Sort: Name" },
	{ value: "marketPrice", label: "Sort: Market price" },
	{ value: "flipPercent", label: "Sort: Flip %" },
	{ value: "craftCost", label: "Sort: Craft cost" },
	{ value: "profitMarginPercent", label: "Sort: Margin" },
	{ value: "groupVolume", label: "Sort: Qty" },
];

export function MarketResults({
	vm,
	layout,
	onOpenFilters,
}: {
	vm: Vm;
	layout: MarketLayout;
	onOpenFilters: () => void;
}) {
	const { items, isInitialLoading, sortBy, sortDir, handleSort, prefetchItem, pagination } = vm;
	const cards = layout === "compact";
	const showFilters = layout !== "full";

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
			{/* Cabeçalho — sempre uma linha só. */}
			<div className="mkt-head" data-compact={cards || undefined}>
				{!cards && <span className="mkt-head-title">Auction House</span>}
				<div className="mkt-head-right">
					<input
						className="mkt-search"
						type="text"
						placeholder="Search by item name…"
						value={vm.search}
						onChange={(e) => vm.setSearch(e.currentTarget.value)}
					/>
					{cards && (
						<select
							className="mkt-sort"
							aria-label="Sort by"
							value={sortBy}
							onChange={(e) => e.currentTarget.value && handleSort(e.currentTarget.value)}
						>
							{SORT_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					)}
					{showFilters && (
						<button type="button" className="mkt-filters-btn" onClick={onOpenFilters}>
							<SlidersHorizontal size={15} /> Options
						</button>
					)}
				</div>
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
				) : cards ? (
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
