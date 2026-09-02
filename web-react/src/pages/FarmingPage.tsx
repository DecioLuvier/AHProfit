import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { farmCraftingOpportunitiesQuery, farmRouteDetailQuery, farmRoutesQuery } from "@/features/farming/api/queries";
import type { CraftingOpportunity } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { fmtGold } from "@/shared/lib/format";
import { CursorPagination } from "@/ui/data-display/CursorPagination";
import { ItemIcon } from "@/ui/data-display/ItemIcon";

const FARMED_PAGE_SIZE = 12;

function fmtRunAt(ts: number | null | undefined): string {
	if (ts == null) return "—";
	const ms = ts < 1e12 ? ts * 1000 : ts;
	return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CraftItem({ o }: { o: CraftingOpportunity }) {
	const [open, setOpen] = useState(false);
	const reagents = [
		...o.farmedReagents.map((r) => ({
			kind: "route" as const,
			id: r.itemId,
			name: r.name,
			icon: r.icon,
			quality: r.quality,
			qualityTier: r.quality_tier,
			quantity: r.quantity,
			cost: "—",
		})),
		...o.reagentsToBuy.map((r) => ({
			kind: "buy" as const,
			id: r.itemId,
			name: r.name,
			icon: r.icon,
			quality: r.quality,
			qualityTier: r.quality_tier,
			quantity: r.quantity,
			cost: fmtGold(r.unitPrice),
		})),
	];
	const hasReagents = reagents.length > 0;

	return (
		<div className="cbd">
			<div
				className="cbd-row cbd-head"
				role="button"
				tabIndex={0}
				aria-expanded={open}
				onClick={() => hasReagents && setOpen((v) => !v)}
				onKeyDown={(e) =>
					hasReagents && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((v) => !v))
				}
			>
				{hasReagents ? (
					<span className="cbd-toggle" data-open={open} aria-hidden="true">
						<ChevronRight size={14} strokeWidth={2.5} />
					</span>
				) : (
					<span className="cbd-toggle cbd-toggle--empty" aria-hidden="true" />
				)}
				<ItemIcon icon={o.icon} name={o.name} quality={o.quality} qualityTier={o.quality_tier} size={30} />
				<Link to={`/items/${o.itemId}`} className="cbd-name cbd-name--link" onClick={(e) => e.stopPropagation()}>
					{o.name}
				</Link>
				<span className="cbd-cost cbd-cost--good">
					{fmtGold(o.goldPerHour)}
					<i>/h</i>
				</span>
			</div>
			{open &&
				reagents.map((r, i) => (
					<div key={`${r.id}-${i}`} className="cbd-row cbd-child">
						<span className="cbd-chev" />
						<ItemIcon icon={r.icon} name={r.name} quality={r.quality} qualityTier={r.qualityTier} size={22} />
						<Link to={`/items/${r.id}`} className="cbd-name cbd-name--link">
							{r.name}
							{r.quantity > 1 && <span className="cbd-qty"> ×{r.quantity}</span>}
						</Link>
						<span className={cn("cbd-badge", r.kind === "route" ? "cbd-badge--route" : "cbd-badge--buy")}>
							{r.kind}
						</span>
						<span className="cbd-cost">{r.cost}</span>
					</div>
				))}
		</div>
	);
}

/* Lembra a última rota escolhida entre entradas/saídas da página (module-level, some
   ao recarregar). Evita o "flicker" de seleção ao remontar o componente. */
let rememberedRouteId: number | null = null;

export function FarmingPage() {
	const queryClient = useQueryClient();
	const { data: routes = [] } = useQuery(farmRoutesQuery);
	const [selectedRouteId, setSelectedRouteId] = useState<number | null>(rememberedRouteId);
	const [itemSearch, setItemSearch] = useState("");
	const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
	const [farmedPage, setFarmedPage] = useState(0);

	/* Selecionada = a escolhida (se ainda existir) ou, senão, a primeira rota.
	   Derivado no render → já vem selecionado no 1º frame, sem piscar. */
	const effectiveRouteId =
		selectedRouteId != null && routes.some((r) => r.id === selectedRouteId)
			? selectedRouteId
			: (routes[0]?.id ?? null);

	function pickRoute(id: number) {
		rememberedRouteId = id;
		setSelectedRouteId(id);
		setPicked(new Set());
	}
	function togglePick(id: number) {
		setPicked((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	const { data: detail, isLoading: detailLoading } = useQuery({
		...farmRouteDetailQuery(effectiveRouteId ?? 0),
		enabled: effectiveRouteId !== null,
	});
	const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery({
		...farmCraftingOpportunitiesQuery(effectiveRouteId ?? 0),
		enabled: effectiveRouteId !== null,
	});

	function handleDelete(routeId: number) {
		import("@/shared/api/client").then(({ client }) =>
			client.farming[":id"].$delete({ param: { id: String(routeId) } }).then(() => {
				if (rememberedRouteId === routeId) rememberedRouteId = null;
				if (selectedRouteId === routeId) setSelectedRouteId(null);
				queryClient.invalidateQueries({ queryKey: ["farming", "routes"] });
				queryClient.removeQueries({ queryKey: ["farming", routeId] });
			}),
		);
	}

	const allResults = detail?.results ?? [];
	const itemTerm = itemSearch.trim().toLowerCase();
	const results = itemTerm ? allResults.filter((r) => r.name.toLowerCase().includes(itemTerm)) : allResults;
	const crafting = opportunities as CraftingOpportunity[];
	const farmedGold = results.reduce((sum, r) => sum + (r.goldPerHour ?? 0), 0);
	const shownCrafting =
		picked.size === 0 ? crafting : crafting.filter((o) => o.farmedReagents.some((r) => picked.has(r.itemId)));

	useEffect(() => {
		setFarmedPage(0);
	}, [effectiveRouteId, itemTerm]);
	const farmedPageCount = Math.ceil(results.length / FARMED_PAGE_SIZE);
	const pagedResults = results.slice(farmedPage * FARMED_PAGE_SIZE, (farmedPage + 1) * FARMED_PAGE_SIZE);
	const farmedRangeLabel =
		results.length > 0
			? `${farmedPage * FARMED_PAGE_SIZE + 1}–${Math.min((farmedPage + 1) * FARMED_PAGE_SIZE, results.length)} of ${results.length}`
			: undefined;

	return (
		<div className="view-fill">
			<div className="bento-page">
				<div className="bento">
					<div className="bento-tile bento-list bento-farmed">
						<div className="bento-tile-head">
							<span>Routes</span>
							<input
								type="text"
								placeholder="Search items…"
								value={itemSearch}
								onChange={(e) => setItemSearch(e.currentTarget.value)}
								style={{ marginLeft: "auto", maxWidth: 260, width: "100%", minWidth: 0 }}
							/>
						</div>
						{routes.length > 0 && (
							<div
								className={cn("farm-routes-cards", effectiveRouteId != null && "has-selection")}
								role="tablist"
								aria-label="Farm routes"
							>
								{routes.map((route) => {
									const active = route.id === effectiveRouteId;
									return (
										<div key={route.id} className={cn("farm-route-card", active && "is-active")}>
											<button
												type="button"
												className="farm-route-card-main"
												aria-pressed={active}
												onClick={() => pickRoute(route.id)}
											>
												<span className="farm-route-card-name">{route.name}</span>
												<span className="farm-route-card-meta">
													<span className="farm-route-card-id">#{route.id}</span>
													<span className="farm-route-card-dot" aria-hidden="true" />
													<span className="farm-route-card-date">{fmtRunAt(route.run_at)}</span>
												</span>
											</button>
											<button
												type="button"
												className="farm-route-card-x"
												title="Delete route"
												aria-label={`Delete ${route.name}`}
												onClick={() => handleDelete(route.id)}
											>
												×
											</button>
										</div>
									);
								})}
							</div>
						)}
						<div className="bento-tile-head bento-tile-head--sub">
							<span>Farmed items</span>
							{picked.size > 0 && (
								<button type="button" className="bento-clear" onClick={() => setPicked(new Set())}>
									{picked.size} selected · clear
								</button>
							)}
							<span className="bento-head-metric">{fmtGold(farmedGold)}/h</span>
						</div>
						<div className="bento-scroll bagscroll">
							{detailLoading ? (
								<p className="bento-loading">Loading…</p>
							) : results.length === 0 ? null : (
								pagedResults.map((r) => {
									const on = picked.has(r.itemId);
									return (
										<div key={r.itemId} className="cbd">
											<div
												className={cn("cbd-row cbd-flat cbd-row--pick", on && "is-picked")}
												role="button"
												tabIndex={0}
												aria-pressed={on}
												onClick={() => togglePick(r.itemId)}
												onKeyDown={(e) =>
													(e.key === "Enter" || e.key === " ") && (e.preventDefault(), togglePick(r.itemId))
												}
											>
												<span className={cn("cbd-check", on && "is-on")} aria-hidden="true">
													{on ? "✓" : ""}
												</span>
												<ItemIcon
													icon={r.icon}
													name={r.name}
													quality={r.quality}
													qualityTier={r.quality_tier}
													size={30}
												/>
												<Link
													to={`/items/${r.itemId}`}
													className="cbd-name cbd-name--link"
													onClick={(e) => e.stopPropagation()}
												>
													{r.name}
												</Link>
												<span className="cbd-cost cbd-cost--stack">
													<span className="cbd-cost--good">
														{r.goldPerHour != null ? fmtGold(r.goldPerHour) : "—"}
														<i>/h</i>
													</span>
													<span className="cbd-cost-sub">{r.perHour}/h</span>
												</span>
											</div>
										</div>
									);
								})
							)}
						</div>
						<div style={{ flexShrink: 0, padding: "0 12px 12px" }}>
							<CursorPagination
								nextCursor={farmedPage + 1 < farmedPageCount ? "next" : null}
								canGoPrev={farmedPage > 0}
								onNext={() => setFarmedPage((p) => p + 1)}
								onPrev={() => setFarmedPage((p) => p - 1)}
								rangeLabel={farmedRangeLabel}
							/>
						</div>
					</div>

					<div className="bento-tile bento-list bento-craft">
						<div className="bento-tile-head">
							<span>Craftable</span>
							{crafting.length > 0 && (
								<span className="bento-pill">
									{picked.size > 0 ? `${shownCrafting.length} / ${crafting.length}` : crafting.length}
								</span>
							)}
						</div>
						<div className="bento-scroll bagscroll">
							{opportunitiesLoading ? (
								<p className="bento-loading">Loading…</p>
							) : shownCrafting.length === 0 ? null : (
								shownCrafting.map((o) => <CraftItem key={o.itemId} o={o} />)
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
