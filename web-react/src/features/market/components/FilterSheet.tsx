import { X } from "lucide-react";
import { type CSSProperties, type Dispatch, type SetStateAction, useState } from "react";
import type { ItemFilterOptionsResponse } from "@/shared/api/client";
import { EXPANSIONS, QUALITY_COLORS } from "@/shared/lib/constants";

const QUALITIES = Object.keys(QUALITY_COLORS).filter((q) => q !== "Artifact" && q !== "Heirloom");

const QUALITY_TIERS = ["1", "2", "3"];

const QUALITY_DESC: Record<string, string> = {
	Poor: "Grey items — vendor fodder, rarely worth listing",
	Common: "White items — reagents, bags and basic gear",
	Uncommon: "Green items — most crafted gear and drops",
	Rare: "Blue items — dungeon and profession gear",
	Epic: "Purple items — raid gear and top-end crafts",
	Legendary: "Orange items — unique, almost never traded",
};

const EXPANSION_ART: Record<string, string> = {
	Classic: "/assets/expansions/classic.png",
	"The Burning Crusade": "/assets/expansions/tbc.png",
	"Wrath of the Lich King": "/assets/expansions/wotlk.png",
	Cataclysm: "/assets/expansions/cata.png",
	"Mists of Pandaria": "/assets/expansions/mop.png",
	"Warlords of Draenor": "/assets/expansions/wod.png",
	Legion: "/assets/expansions/legion.png",
	"Battle for Azeroth": "/assets/expansions/bfa.png",
	Shadowlands: "/assets/expansions/shadowlands.png",
	Dragonflight: "/assets/expansions/dragonflight.png",
	"The War Within": "/assets/expansions/tww.png",
	Midnight: "/assets/expansions/midnight.png",
};

const EXPANSION_YEAR: Record<string, string> = {
	Classic: "2004",
	"The Burning Crusade": "2007",
	"Wrath of the Lich King": "2008",
	Cataclysm: "2010",
	"Mists of Pandaria": "2012",
	"Warlords of Draenor": "2014",
	Legion: "2016",
	"Battle for Azeroth": "2018",
	Shadowlands: "2020",
	Dragonflight: "2022",
	"The War Within": "2024",
	Midnight: "2026",
};

const FLAG_DEFS = [
	{ key: "onlyProfitableCraft" as const, label: "Profitable craft", desc: "Craft cost is below current market price" },
	{
		key: "onlyAboveVendorPrice" as const,
		label: "AH price above vendor",
		desc: "Selling on the AH beats the vendor price",
	},
	{
		key: "hasAuctionHousePrice" as const,
		label: "Has AH price",
		desc: "Hides items with no auction listing on record",
	},
];

type SetStr = Dispatch<SetStateAction<string>>;
type SetSet = Dispatch<SetStateAction<Set<string>>>;

export interface FilterSheetProps {
	facets: ItemFilterOptionsResponse | null;
	resultCount: number;

	quality: Set<string>;
	setQuality: SetSet;
	qualityTier: Set<string>;
	setQualityTier: SetSet;
	slot: Set<string>;
	setSlot: SetSet;
	itemClass: Set<string>;
	setItemClass: SetSet;
	itemSubclass: Set<string>;
	setItemSubclass: SetSet;
	expansions: Set<string>;
	setExpansions: SetSet;

	onlyProfitableCraft: boolean;
	setOnlyProfitableCraft: Dispatch<SetStateAction<boolean>>;
	onlyAboveVendorPrice: boolean;
	setOnlyAboveVendorPrice: Dispatch<SetStateAction<boolean>>;
	hasAuctionHousePrice: boolean;
	setHasAuctionHousePrice: Dispatch<SetStateAction<boolean>>;

	minMarginPercent: string;
	setMinMarginPercent: SetStr;
	maxMarginPercent: string;
	setMaxMarginPercent: SetStr;
	minMarketPrice: string;
	setMinMarketPrice: SetStr;
	maxMarketPrice: string;
	setMaxMarketPrice: SetStr;
	minCraftCost: string;
	setMinCraftCost: SetStr;
	maxCraftCost: string;
	setMaxCraftCost: SetStr;
	minFlipPercent: string;
	setMinFlipPercent: SetStr;
	maxFlipPercent: string;
	setMaxFlipPercent: SetStr;
	minListedByName: string;
	setMinListedByName: SetStr;
	maxListedByName: string;
	setMaxListedByName: SetStr;
	compact?: boolean;
	mobileOpen?: boolean;
	onMobileOpenChange?: (open: boolean) => void;
}

function toggleInSet(setSet: SetSet, value: string) {
	setSet((prev) => {
		const next = new Set(prev);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		return next;
	});
}

const railLabelStyle = {
	fontFamily: "var(--font-body)",
	fontSize: 10.5,
	fontWeight: 700,
	letterSpacing: "0.12em",
	textTransform: "uppercase" as const,
	color: "var(--text-dim)",
};

type SectionKey = "filters" | "class" | "expansion";

export function FilterSheet(props: FilterSheetProps) {
	const { facets, resultCount } = props;
	const [section, setSection] = useState<SectionKey>("filters");

	const numActive = [
		props.minMarginPercent,
		props.maxMarginPercent,
		props.minMarketPrice,
		props.maxMarketPrice,
		props.minCraftCost,
		props.maxCraftCost,
		props.minFlipPercent,
		props.maxFlipPercent,
		props.minListedByName,
		props.maxListedByName,
	].filter((v) => v !== "").length;
	const flagsActive = FLAG_DEFS.filter((f) => props[f.key]).length;
	const filtersCount = props.quality.size + props.qualityTier.size + flagsActive + numActive;
	const classCount = props.itemClass.size + props.slot.size + props.itemSubclass.size;
	const totalActive = filtersCount + classCount + props.expansions.size;

	function resetAll() {
		props.setQuality(new Set());
		props.setQualityTier(new Set());
		props.setSlot(new Set());
		props.setItemClass(new Set());
		props.setItemSubclass(new Set());
		props.setExpansions(new Set());
		props.setOnlyProfitableCraft(false);
		props.setOnlyAboveVendorPrice(false);
		props.setHasAuctionHousePrice(false);
		props.setMinMarginPercent("");
		props.setMaxMarginPercent("");
		props.setMinMarketPrice("");
		props.setMaxMarketPrice("");
		props.setMinCraftCost("");
		props.setMaxCraftCost("");
		props.setMinFlipPercent("");
		props.setMaxFlipPercent("");
		props.setMinListedByName("");
		props.setMaxListedByName("");
	}

	const sections: { key: SectionKey; label: string; count: number }[] = [
		{ key: "filters", label: "Filters", count: filtersCount },
		{ key: "class", label: "Class", count: classCount },
		{ key: "expansion", label: "Expansion", count: props.expansions.size },
	];
	const activeLabel = sections.find((s) => s.key === section)?.label ?? "";

	const compact = props.compact ?? false;
	const close = () => props.onMobileOpenChange?.(false);
	const rootStyle: CSSProperties = compact
		? {
				/* Overlay ancorado ao container (.market-layout, position: relative):
				   mesma altura vertical do glass principal. */
				display: props.mobileOpen ? "flex" : "none",
				position: "absolute",
				top: 0,
				right: 0,
				bottom: 0,
				left: "auto",
				width: "min(420px, 100%)",
				zIndex: 20,
				flexDirection: "column",
				minHeight: 0,
				background: "var(--panel-head-solid)",
				border: "1px solid var(--border-strong)",
				borderRadius: "var(--radius)",
				overflow: "hidden",
				boxShadow: "-24px 0 70px oklch(0 0 0 / 0.55)",
			}
		: {
				width: 480,
				maxWidth: 480,
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				background: "var(--panel)",
				border: "1px solid var(--border)",
				borderRadius: "var(--radius)",
				overflow: "hidden",
			};

	return (
		<>
			{compact && props.mobileOpen && (
				<div
					onClick={close}
					style={{
						position: "absolute",
						inset: 0,
						zIndex: 19,
						background: "oklch(0 0 0 / 0.5)",
						backdropFilter: "blur(2px)",
						borderRadius: "var(--radius)",
					}}
				/>
			)}
			<div className="filter-panel" style={rootStyle}>
				{compact && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "10px 10px 10px 16px",
							borderBottom: "1px solid var(--border-soft)",
							background: "var(--panel-head-solid)",
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontFamily: "var(--font-display)",
								fontSize: 13,
								fontWeight: 700,
								letterSpacing: "0.07em",
								textTransform: "uppercase",
								color: "var(--text-dim)",
							}}
						>
							Filters
						</span>
						<button
							type="button"
							onClick={close}
							aria-label="Close filters"
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 6,
								height: 34,
								padding: "0 14px",
								borderRadius: 999,
								border: "1px solid var(--border-strong)",
								background: "var(--panel-head-solid)",
								color: "var(--text)",
								fontSize: 12.5,
								fontWeight: 700,
								cursor: "pointer",
							}}
						>
							<X size={16} strokeWidth={2.5} /> Close
						</button>
					</div>
				)}
				<div
					style={{
						display: "flex",
						height: 44,
						boxSizing: "border-box",
						borderBottom: "1px solid var(--border-soft)",
						background: "var(--panel-solid)",
						flexShrink: 0,
					}}
				>
					{sections.map((s) => {
						const on = section === s.key;
						return (
							<button
								key={s.key}
								type="button"
								onClick={() => setSection(s.key)}
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									padding: "0 4px",
									border: "none",
									borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
									background: on ? "oklch(0.64 0.18 285 / 0.16)" : "transparent",
									color: on ? "var(--text)" : "var(--text-dim)",
									fontFamily: "var(--font-body)",
									fontSize: 12,
									fontWeight: on ? 600 : 400,
									cursor: "pointer",
								}}
							>
								{s.label}
								{s.count > 0 && (
									<span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)" }}>{s.count}</span>
								)}
							</button>
						);
					})}
				</div>

				<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 24px" }}>
					<div
						style={{
							flexShrink: 0,
							fontFamily: "var(--font-display)",
							fontSize: 20,
							fontWeight: 700,
							letterSpacing: "0.03em",
							textTransform: "uppercase",
							color: "var(--text)",
						}}
					>
						{activeLabel}
					</div>
					<div style={{ flexShrink: 0, height: 1, background: "var(--border-soft)", margin: "12px 0 18px" }} />

					<div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="bagscroll">
						{section === "filters" && (
							<FiltersPane
								quality={props.quality}
								onToggleQuality={(q) => toggleInSet(props.setQuality, q)}
								qualityTier={props.qualityTier}
								onToggleQualityTier={(t) => toggleInSet(props.setQualityTier, t)}
								flags={props}
								minMarginPercent={props.minMarginPercent}
								setMinMarginPercent={props.setMinMarginPercent}
								maxMarginPercent={props.maxMarginPercent}
								setMaxMarginPercent={props.setMaxMarginPercent}
								minMarketPrice={props.minMarketPrice}
								setMinMarketPrice={props.setMinMarketPrice}
								maxMarketPrice={props.maxMarketPrice}
								setMaxMarketPrice={props.setMaxMarketPrice}
								minCraftCost={props.minCraftCost}
								setMinCraftCost={props.setMinCraftCost}
								maxCraftCost={props.maxCraftCost}
								setMaxCraftCost={props.setMaxCraftCost}
								minFlipPercent={props.minFlipPercent}
								setMinFlipPercent={props.setMinFlipPercent}
								maxFlipPercent={props.maxFlipPercent}
								setMaxFlipPercent={props.setMaxFlipPercent}
								minListedByName={props.minListedByName}
								setMinListedByName={props.setMinListedByName}
								maxListedByName={props.maxListedByName}
								setMaxListedByName={props.setMaxListedByName}
							/>
						)}

						{section === "class" && (
							<ClassPane
								facets={facets}
								itemClass={props.itemClass}
								onToggleClass={(c) => toggleInSet(props.setItemClass, c)}
								slot={props.slot}
								onToggleSlot={(s) => toggleInSet(props.setSlot, s)}
								itemSubclass={props.itemSubclass}
								onToggleSubclass={(s) => toggleInSet(props.setItemSubclass, s)}
							/>
						)}

						{section === "expansion" && (
							<ExpansionPane expansions={props.expansions} onToggle={(e) => toggleInSet(props.setExpansions, e)} />
						)}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						padding: "14px 24px",
						borderTop: "1px solid var(--border-soft)",
						flexShrink: 0,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={resetAll}
							style={{ opacity: totalActive ? 1 : 0.4 }}
						>
							Reset all
						</button>
						<div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
							<span style={{ color: "var(--accent)", fontSize: 15, fontWeight: 700 }}>{resultCount}</span> matches
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function qualityTint(color: string) {
	const c = color.replace("#", "");
	const r = Number.parseInt(c.slice(0, 2), 16);
	const g = Number.parseInt(c.slice(2, 4), 16);
	const b = Number.parseInt(c.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

function OptionRow({
	label,
	desc,
	on,
	shape = "square",
	onToggle,
}: {
	label: string;
	desc: string;
	on: boolean;
	shape?: "square" | "circle";
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			title={desc}
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: 9,
				width: "100%",
				textAlign: "left",
				padding: "6px 10px",
				borderRadius: "var(--radius)",
				cursor: "pointer",
				border: "none",
				borderLeft: `2px solid ${on ? "var(--accent)" : "transparent"}`,
				background: on ? "linear-gradient(95deg, oklch(0.64 0.18 285 / 0.3), oklch(0.64 0.18 285 / 0))" : "transparent",
			}}
		>
			<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
				<span
					style={{
						fontWeight: on ? 700 : 600,
						fontSize: 12.5,
						color: "var(--text)",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{label}
				</span>
				<span
					style={{
						fontSize: 11,
						color: "var(--text-dim)",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{desc}
				</span>
			</span>
			<span
				style={{
					width: 15,
					height: 15,
					flexShrink: 0,
					borderRadius: shape === "circle" ? "50%" : 4,
					border: `1.4px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
					background: on ? "var(--accent)" : "transparent",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{on && shape === "square" && (
					<span style={{ fontSize: 10, fontWeight: 900, color: "oklch(0.16 0.02 285)", lineHeight: 1 }}>✓</span>
				)}
				{on && shape === "circle" && (
					<span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.16 0.02 285)" }} />
				)}
			</span>
		</button>
	);
}

function FiltersPane(props: {
	quality: Set<string>;
	onToggleQuality: (q: string) => void;
	qualityTier: Set<string>;
	onToggleQualityTier: (t: string) => void;
	flags: Pick<
		FilterSheetProps,
		| "onlyProfitableCraft"
		| "setOnlyProfitableCraft"
		| "onlyAboveVendorPrice"
		| "setOnlyAboveVendorPrice"
		| "hasAuctionHousePrice"
		| "setHasAuctionHousePrice"
	>;
	minMarginPercent: string;
	setMinMarginPercent: SetStr;
	maxMarginPercent: string;
	setMaxMarginPercent: SetStr;
	minMarketPrice: string;
	setMinMarketPrice: SetStr;
	maxMarketPrice: string;
	setMaxMarketPrice: SetStr;
	minCraftCost: string;
	setMinCraftCost: SetStr;
	maxCraftCost: string;
	setMaxCraftCost: SetStr;
	minFlipPercent: string;
	setMinFlipPercent: SetStr;
	maxFlipPercent: string;
	setMaxFlipPercent: SetStr;
	minListedByName: string;
	setMinListedByName: SetStr;
	maxListedByName: string;
	setMaxListedByName: SetStr;
}) {
	const flagValues: Record<string, boolean> = {
		onlyProfitableCraft: props.flags.onlyProfitableCraft,
		onlyAboveVendorPrice: props.flags.onlyAboveVendorPrice,
		hasAuctionHousePrice: props.flags.hasAuctionHousePrice,
	};
	const flagSetters: Record<string, Dispatch<SetStateAction<boolean>>> = {
		onlyProfitableCraft: props.flags.setOnlyProfitableCraft,
		onlyAboveVendorPrice: props.flags.setOnlyAboveVendorPrice,
		hasAuctionHousePrice: props.flags.setHasAuctionHousePrice,
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
			<div style={{ ...railLabelStyle, padding: "0 2px 6px" }}>Rarity</div>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
				{QUALITIES.map((q) => {
					const color = QUALITY_COLORS[q];
					const on = props.quality.has(q);
					return (
						<button
							key={q}
							type="button"
							title={QUALITY_DESC[q] ?? ""}
							onClick={() => props.onToggleQuality(q)}
							style={{
								position: "relative",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 5,
								padding: "8px 4px 6px",
								borderRadius: "var(--radius)",
								border: `1px solid ${on ? color : "var(--border-strong)"}`,
								background: on ? qualityTint(color) : "var(--panel)",
								cursor: "pointer",
							}}
						>
							<span
								style={{
									width: 12,
									height: 12,
									transform: "rotate(45deg)",
									background: on ? color : "transparent",
									border: `1.4px solid ${color}`,
								}}
							/>
							<span
								style={{
									fontFamily: "var(--font-display)",
									fontSize: 9.5,
									fontWeight: 700,
									letterSpacing: "0.03em",
									textTransform: "uppercase",
									color: on ? color : "var(--text-dim)",
								}}
							>
								{q}
							</span>
						</button>
					);
				})}
			</div>

			<div style={{ ...railLabelStyle, padding: "8px 2px 6px", borderTop: "1px solid var(--border-soft)" }}>
				Quality
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
				{QUALITY_TIERS.map((t) => {
					const on = props.qualityTier.has(t);
					return (
						<button
							key={t}
							type="button"
							title={`Craft quality tier ${t}`}
							onClick={() => props.onToggleQualityTier(t)}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: "8px 4px",
								borderRadius: "var(--radius)",
								border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
								background: on ? "oklch(0.64 0.18 285 / 0.22)" : "var(--panel)",
								cursor: "pointer",
								opacity: on || props.qualityTier.size === 0 ? 1 : 0.5,
							}}
						>
							<img
								src={`/icons/quality/tier${t}.png`}
								alt={`Tier ${t}`}
								width={24}
								height={24}
								style={{ objectFit: "contain" }}
							/>
						</button>
					);
				})}
			</div>

			<div style={{ ...railLabelStyle, padding: "8px 2px 6px", borderTop: "1px solid var(--border-soft)" }}>
				Attributes
			</div>
			<div
				style={{
					background: "var(--panel-inset)",
					border: "1px solid var(--border-soft)",
					borderRadius: 6,
					flex: 1,
					minHeight: 60,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					padding: 4,
				}}
			>
				{FLAG_DEFS.map((f) => (
					<OptionRow
						key={f.key}
						label={f.label}
						desc={f.desc}
						on={flagValues[f.key]}
						onToggle={() => flagSetters[f.key]((v) => !v)}
					/>
				))}
			</div>

			<div style={{ marginTop: 12, flexShrink: 0 }}>
				<div style={{ ...railLabelStyle, padding: "0 2px 6px" }}>Thresholds</div>
				<div
					style={{
						background: "var(--panel-inset)",
						border: "1px solid var(--border-soft)",
						borderRadius: 6,
						maxHeight: 200,
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						gap: 8,
						padding: 10,
					}}
				>
					<RangeField
						label="Budget cap"
						minValue={props.minCraftCost}
						setMin={props.setMinCraftCost}
						maxValue={props.maxCraftCost}
						setMax={props.setMaxCraftCost}
					/>
					<RangeField
						label="Margin %"
						minValue={props.minMarginPercent}
						setMin={props.setMinMarginPercent}
						maxValue={props.maxMarginPercent}
						setMax={props.setMaxMarginPercent}
					/>
					<RangeField
						label="Flip %"
						minValue={props.minFlipPercent}
						setMin={props.setMinFlipPercent}
						maxValue={props.maxFlipPercent}
						setMax={props.setMaxFlipPercent}
					/>
					<RangeField
						label="Market price"
						minValue={props.minMarketPrice}
						setMin={props.setMinMarketPrice}
						maxValue={props.maxMarketPrice}
						setMax={props.setMaxMarketPrice}
					/>
					<RangeField
						label="Listed"
						minValue={props.minListedByName}
						setMin={props.setMinListedByName}
						maxValue={props.maxListedByName}
						setMax={props.setMaxListedByName}
					/>
				</div>
			</div>
		</div>
	);
}

function RangeField({
	label,
	minValue,
	setMin,
	maxValue,
	setMax,
}: {
	label: string;
	minValue: string;
	setMin: SetStr;
	maxValue: string;
	setMax: SetStr;
}) {
	const inputStyle: CSSProperties = {
		width: "100%",
		textAlign: "center",
		padding: "4px 6px",
		fontSize: 12,
		boxSizing: "border-box",
	};
	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
			<span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{label}</span>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto 1fr",
					alignItems: "center",
					gap: 4,
					flex: 1,
					maxWidth: 160,
				}}
			>
				<input
					type="text"
					inputMode="decimal"
					placeholder="Min"
					value={minValue}
					onChange={(e) => setMin(e.target.value)}
					style={inputStyle}
				/>
				<span style={{ color: "var(--text-dimmer)", fontSize: 11, userSelect: "none" }}>–</span>
				<input
					type="text"
					inputMode="decimal"
					placeholder="Max"
					value={maxValue}
					onChange={(e) => setMax(e.target.value)}
					style={inputStyle}
				/>
			</div>
		</div>
	);
}

function optionChipStyle(on: boolean): CSSProperties {
	return {
		padding: "6px 11px",
		borderRadius: "var(--radius)",
		fontFamily: "var(--font-body)",
		fontSize: 12,
		fontWeight: on ? 600 : 400,
		cursor: "pointer",
		border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
		background: on ? "oklch(0.64 0.18 285 / 0.22)" : "transparent",
		color: on ? "var(--accent-strong)" : "var(--text-dim)",
	};
}

function ClassPane(props: {
	facets: ItemFilterOptionsResponse | null;
	itemClass: Set<string>;
	onToggleClass: (c: string) => void;
	slot: Set<string>;
	onToggleSlot: (s: string) => void;
	itemSubclass: Set<string>;
	onToggleSubclass: (s: string) => void;
}) {
	const { facets } = props;
	return (
		<div>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
				{(facets?.itemClasses ?? []).map((c) => {
					const on = props.itemClass.has(c);
					return (
						<button
							key={c}
							type="button"
							onClick={() => props.onToggleClass(c)}
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 4,
								textAlign: "left",
								padding: "11px 10px",
								minHeight: 54,
								minWidth: 0,
								justifyContent: "center",
								borderRadius: "var(--radius)",
								border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
								background: on ? "oklch(0.64 0.18 285 / 0.22)" : "var(--panel)",
								cursor: "pointer",
							}}
						>
							<span
								style={{
									fontFamily: "var(--font-display)",
									fontSize: 12,
									fontWeight: 700,
									letterSpacing: "0.03em",
									textTransform: "uppercase",
									lineHeight: 1.15,
									overflowWrap: "anywhere",
									color: on ? "var(--accent-strong)" : "var(--text)",
								}}
							>
								{c}
							</span>
						</button>
					);
				})}
			</div>

			{props.itemClass.size > 0 && facets?.slots && facets.slots.length > 0 && (
				<div style={{ marginTop: 18 }}>
					<div style={{ ...railLabelStyle, paddingBottom: 8 }}>Slot</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
						{facets.slots.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => props.onToggleSlot(s)}
								style={optionChipStyle(props.slot.has(s))}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			)}

			{props.itemClass.size > 0 && facets?.itemSubclasses && facets.itemSubclasses.length > 0 && (
				<div style={{ marginTop: 18 }}>
					<div style={{ ...railLabelStyle, paddingBottom: 8 }}>Subclass</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
						{facets.itemSubclasses.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => props.onToggleSubclass(s)}
								style={optionChipStyle(props.itemSubclass.has(s))}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function ExpansionPane({ expansions, onToggle }: { expansions: Set<string>; onToggle: (e: string) => void }) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
			{EXPANSIONS.map((e) => {
				const on = expansions.has(e);
				const art = EXPANSION_ART[e];
				return (
					<button
						key={e}
						type="button"
						onClick={() => onToggle(e)}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 8,
							padding: 8,
							borderRadius: "var(--radius)",
							border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
							cursor: "pointer",
							textAlign: "left",
							background: on ? "oklch(0.64 0.18 285 / 0.22)" : "var(--panel-solid)",
							boxShadow: on ? "0 0 0 1px var(--accent)" : "none",
							opacity: on || expansions.size === 0 ? 1 : 0.55,
						}}
					>
						<div
							style={{
								width: "100%",
								aspectRatio: "3 / 4",
								borderRadius: 6,
								overflow: "hidden",
								background: "var(--panel)",
							}}
						>
							{art && (
								<img
									src={art}
									alt={e}
									style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
								/>
							)}
						</div>
						<div>
							<div style={{ fontFamily: "var(--font-body)", fontSize: 9.5, color: "var(--text-dimmer)" }}>
								{EXPANSION_YEAR[e]}
							</div>
							<div
								style={{
									fontFamily: "var(--font-display)",
									fontSize: 12.5,
									fontWeight: 700,
									lineHeight: 1.2,
									letterSpacing: "0.01em",
									textTransform: "uppercase",
									color: on ? "var(--accent-strong)" : "var(--text)",
								}}
							>
								{e}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
