import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { charactersQuery, inventoryQuery, professionsQuery } from "@/features/characters/api/queries";
import type { CharacterProfessionRow, CharacterRow, InventoryRow } from "@/shared/api/client";
import { PROFESSION_BY_ID, QUALITY_COLORS } from "@/shared/lib/constants";
import { classIconUrl, fmtGold, iconUrl, raceIconUrl } from "@/shared/lib/format";
import { CursorPagination } from "@/ui/data-display/CursorPagination";
import { GlassCard } from "@/ui/data-display/GlassCard";
import { ItemIcon } from "@/ui/data-display/ItemIcon";

const BAG_PAGE_SIZE = 80;

const COMPACT_BELOW = 1120;
const HYSTERESIS = 60;
const BAG_CELL = 46;

function CharacterAvatar({ characterClass, race, gender }: { characterClass: string; race: string; gender: string }) {
	const classIcon = classIconUrl(characterClass);
	const raceIcon = raceIconUrl(race, gender);
	if (!classIcon) return null;
	return (
		<div style={{ position: "relative", flexShrink: 0, width: 34, height: 34 }}>
			<img
				src={classIcon}
				alt={characterClass}
				width={34}
				height={34}
				style={{ borderRadius: 6, border: "1.5px solid var(--accent)", display: "block", objectFit: "cover" }}
			/>
			{raceIcon && (
				<img
					src={raceIcon}
					alt={race}
					width={16}
					height={16}
					style={{
						position: "absolute",
						right: -4,
						bottom: -4,
						borderRadius: 4,
						border: "1.5px solid oklch(0.16 0.02 285)",
					}}
				/>
			)}
		</div>
	);
}

function ProfessionBar({ bestSkill, capSkill }: { bestSkill: number; capSkill: number }) {
	const pct = capSkill > 0 ? Math.min(100, Math.round((bestSkill / capSkill) * 100)) : 0;
	return (
		<div style={{ height: 4, borderRadius: 2, background: "var(--border-strong)", overflow: "hidden", marginTop: 4 }}>
			<div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: "var(--accent)" }} />
		</div>
	);
}

function AnimatedGold({ value }: { value: number }) {
	return <span>{fmtGold(value)}</span>;
}

export function CharactersPage() {
	const [search, setSearch] = useState("");
	const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<number>>(new Set());
	const [bagPage, setBagPage] = useState(0);

	const layoutRef = useRef<HTMLDivElement>(null);
	const [compact, setCompact] = useState(false);
	useLayoutEffect(() => {
		const el = layoutRef.current;
		if (!el) return;
		let raf = 0;
		let lastW = -1;
		const measure = () => {
			raf = 0;
			const w = el.clientWidth;
			if (w === lastW) return; // ignora mudança só de altura → sem flicker
			lastW = w;
			setCompact((prev) => (prev ? w < COMPACT_BELOW + HYSTERESIS : w < COMPACT_BELOW));
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(measure);
		};
		measure();
		const ro = new ResizeObserver(schedule);
		ro.observe(el);
		window.addEventListener("resize", schedule);
		document.addEventListener("visibilitychange", schedule);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", schedule);
			document.removeEventListener("visibilitychange", schedule);
			if (raf) cancelAnimationFrame(raf);
		};
	}, []);

	const { data: characters = [], isLoading: loading } = useQuery(charactersQuery);
	const { data: professions = [] } = useQuery(professionsQuery);
	const { data: inventoryRows = [], isLoading: inventoryLoading } = useQuery(inventoryQuery);

	const totalGold = (characters as CharacterRow[]).reduce((sum, c) => sum + (c.current_gold ?? 0), 0);

	function toggleCharacter(id: number) {
		setSelectedCharacterIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const bagItems = useMemo(() => {
		const rows =
			selectedCharacterIds.size === 0
				? inventoryRows
				: (inventoryRows as InventoryRow[]).filter((r) => selectedCharacterIds.has(r.character_id));
		const byItem = new Map<
			number,
			{ id: number; name: string; icon: string; quality: string | null; quality_tier: number | null; count: number }
		>();
		for (const r of rows as (InventoryRow & { item_quality_tier?: number | null })[]) {
			const existing = byItem.get(r.item_id);
			if (existing) existing.count += r.count;
			else
				byItem.set(r.item_id, {
					id: r.item_id,
					name: r.item_name,
					icon: r.item_icon,
					quality: r.item_quality,
					quality_tier: r.item_quality_tier ?? null,
					count: r.count,
				});
		}
		return [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name));
	}, [inventoryRows, selectedCharacterIds]);

	const searchTerm = search.trim().toLowerCase();
	const filteredBagItems = useMemo(
		() => (searchTerm.length === 0 ? bagItems : bagItems.filter((i) => i.name.toLowerCase().includes(searchTerm))),
		[bagItems, searchTerm],
	);

	useEffect(() => {
		setBagPage(0);
	}, [bagItems, searchTerm]);

	const bagPageCount = Math.ceil(filteredBagItems.length / BAG_PAGE_SIZE);
	const pagedBagItems = filteredBagItems.slice(bagPage * BAG_PAGE_SIZE, (bagPage + 1) * BAG_PAGE_SIZE);
	const bagRangeLabel =
		filteredBagItems.length > 0
			? `${bagPage * BAG_PAGE_SIZE + 1}–${Math.min((bagPage + 1) * BAG_PAGE_SIZE, filteredBagItems.length)} of ${filteredBagItems.length}`
			: undefined;

	const professionRows = useMemo(() => {
		const byProfessionId = new Map<number, { characterName: string; skillLevel: number; maxSkillLevel: number }[]>();
		for (const p of professions as CharacterProfessionRow[]) {
			const list = byProfessionId.get(p.profession_id) ?? [];
			list.push({ characterName: p.character_name, skillLevel: p.skill_level, maxSkillLevel: p.max_skill_level });
			byProfessionId.set(p.profession_id, list);
		}
		return Object.entries(PROFESSION_BY_ID).map(([idStr, name]) => {
			const entries = byProfessionId.get(Number(idStr)) ?? [];
			const bestSkill = entries.reduce((max, e) => Math.max(max, e.skillLevel), 0);
			const capSkill = entries[0]?.maxSkillLevel ?? 100;
			return {
				name,
				bestSkill,
				capSkill,
				summary: entries.length ? entries.map((e) => `${e.characterName} (${e.skillLevel})`).join(" · ") : "",
			};
		});
	}, [professions]);

	return (
		<div className="view-fill">
			<div
				ref={layoutRef}
				className="characters-layout"
				style={{
					display: "flex",
					flexDirection: compact ? "column" : "row",
					flex: 1,
					minHeight: 0,
					gap: 16,
					overflowY: compact ? "auto" : "visible",
				}}
			>
				<GlassCard
					p={0}
					className="characters-bag"
					style={{
						flex: compact ? "0 0 auto" : 1,
						minWidth: 0,
						minHeight: compact ? 380 : 0,
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							height: 44,
							boxSizing: "border-box",
							padding: "0 16px",
							borderBottom: "1px solid var(--border-soft)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexShrink: 0,
							gap: 12,
						}}
					>
						<div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
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
								Bag
							</div>
						</div>
						<input
							type="text"
							placeholder="Search bag items…"
							value={search}
							onChange={(e) => setSearch(e.currentTarget.value)}
							style={{ maxWidth: 260, width: "100%", minWidth: 0 }}
						/>
					</div>
					<div className="bagscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14 }}>
						{inventoryLoading && <p style={{ color: "var(--text-dim)", padding: 4 }}>Loading inventory…</p>}
						{pagedBagItems.length > 0 && (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: `repeat(auto-fill, ${BAG_CELL}px)`,
									justifyContent: "start",
									gap: 8,
									alignContent: "start",
								}}
							>
								{pagedBagItems.map((item) => {
									return (
										<Link
											key={item.id}
											to={`/items/${item.id}`}
											title={`${item.name} (${item.quality ?? "Common"}) ×${item.count}`}
											style={{
												position: "relative",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												width: BAG_CELL,
												height: BAG_CELL,
												borderRadius: 6,
												background: "var(--panel-inset)",
												textDecoration: "none",
												color: "inherit",
												transition: "transform 0.15s, box-shadow 0.15s",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.transform = "scale(1.08)";
												e.currentTarget.style.zIndex = "5";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.transform = "scale(1)";
												e.currentTarget.style.zIndex = "1";
											}}
										>
											<ItemIcon
												icon={item.icon}
												name={item.name}
												quality={item.quality}
												qualityTier={item.quality_tier}
												size={46}
												borderRadius={6}
											/>
											{item.count > 1 && (
												<span
													style={{
														position: "absolute",
														right: 3,
														bottom: 1,
														fontSize: 10.5,
														fontWeight: 800,
														color: "#ffffff",
														textShadow: "0 1px 2px #000, 0 0 3px #000, 0 0 5px #000",
														pointerEvents: "none",
														lineHeight: 1,
													}}
												>
													{item.count}
												</span>
											)}
										</Link>
									);
								})}
							</div>
						)}
					</div>
					<div style={{ flexShrink: 0, padding: 12 }}>
						<CursorPagination
							nextCursor={bagPage + 1 < bagPageCount ? "next" : null}
							canGoPrev={bagPage > 0}
							onNext={(_cursor) => setBagPage((p) => p + 1)}
							onPrev={() => setBagPage((p) => p - 1)}
							rangeLabel={bagRangeLabel}
						/>
					</div>
				</GlassCard>

				<div
					className="characters-side"
					style={{
						width: compact ? "100%" : 480,
						flexShrink: 0,
						display: "flex",
						flexDirection: "column",
						minHeight: 0,
					}}
				>
					<GlassCard
						p={0}
						style={{
							flex: compact ? "0 0 auto" : 1,
							minHeight: compact ? 620 : 0,
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								height: 44,
								boxSizing: "border-box",
								padding: "0 16px",
								borderBottom: "1px solid var(--border-soft)",
								flexShrink: 0,
							}}
						>
							<span
								style={{
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: "0.06em",
									textTransform: "uppercase",
									color: "var(--accent-strong)",
									whiteSpace: "nowrap",
								}}
							>
								Roster
							</span>
							<span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
								<AnimatedGold value={totalGold} />
							</span>
						</div>
						<div className="bagscroll" style={{ flex: 1, minHeight: 60, overflowY: "auto" }}>
							{loading && (characters as CharacterRow[]).length === 0 && (
								<p style={{ color: "var(--text-dim)", padding: 16 }}>Loading…</p>
							)}
							{(characters as CharacterRow[]).map((c) => {
								const selected = selectedCharacterIds.has(c.id);
								return (
									<button
										key={c.id}
										type="button"
										onClick={() => toggleCharacter(c.id)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 10,
											width: "100%",
											padding: "10px 16px",
											fontSize: 13,
											boxSizing: "border-box",
											background: selected ? "oklch(0.64 0.18 285 / 0.16)" : "transparent",
											border: "none",
											borderTop: "1px solid var(--border-soft)",
											cursor: "pointer",
											textAlign: "left",
											color: "inherit",
											font: "inherit",
										}}
									>
										<CharacterAvatar characterClass={c.class} race={c.race} gender={c.gender} />
										<div style={{ flex: 1, minWidth: 0 }}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
												<span style={{ fontWeight: 700 }}>{c.name}</span>
												<span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12.5 }}>
													{c.current_gold !== null ? fmtGold(c.current_gold) : "—"}
												</span>
											</div>
											<div style={{ color: "var(--accent)", fontSize: 11, marginTop: 1, textTransform: "capitalize" }}>
												{c.race} {c.class}
											</div>
											<div style={{ color: "var(--text-dim)", fontSize: 11.5, marginTop: 1 }}>{c.realm}</div>
										</div>
									</button>
								);
							})}
						</div>
						<div
							style={{
								height: 44,
								boxSizing: "border-box",
								padding: "0 16px",
								display: "flex",
								alignItems: "center",
								borderTop: "1px solid var(--border-soft)",
								borderBottom: "1px solid var(--border-soft)",
								flexShrink: 0,
							}}
						>
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
								Professions
							</div>
						</div>
						<div
							className="bagscroll"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 12,
								flex: 1,
								minHeight: 0,
								overflowY: "auto",
								padding: 14,
							}}
						>
							{professionRows.map((pr) => (
								<div key={pr.name}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											fontSize: 13,
											fontWeight: 700,
											marginBottom: 4,
										}}
									>
										<span>{pr.name}</span>
										<span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
											{pr.bestSkill}/{pr.capSkill}
										</span>
									</div>
									<ProfessionBar bestSkill={pr.bestSkill} capSkill={pr.capSkill} />
									{pr.summary && (
										<div style={{ fontSize: 11, color: "var(--text-dimmer)", marginTop: 3 }}>{pr.summary}</div>
									)}
								</div>
							))}
						</div>
					</GlassCard>
				</div>
			</div>
		</div>
	);
}
