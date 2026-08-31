import { useLayoutEffect, useRef, useState } from "react";
import { FilterSheet } from "@/features/market/components/FilterSheet";
import { MarketResults } from "@/features/market/components/MarketResults";
import { useMarketTable } from "@/features/market/hooks/useMarketTable";

const COMPACT_BELOW = 1240;
const HYSTERESIS = 60;

export function MarketPage() {
	const vm = useMarketTable();
	const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

	const layoutRef = useRef<HTMLDivElement>(null);
	const [compact, setCompact] = useState(false);
	useLayoutEffect(() => {
		const el = layoutRef.current;
		if (!el) return;
		const measure = () =>
			setCompact((prev) => {
				const w = el.clientWidth;
				return prev ? w < COMPACT_BELOW + HYSTERESIS : w < COMPACT_BELOW;
			});
		const update = () => {
			measure();
			requestAnimationFrame(measure);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener("resize", update);
		document.addEventListener("visibilitychange", update);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", update);
			document.removeEventListener("visibilitychange", update);
		};
	}, []);

	return (
		<div className="view-fill">
			<div
				ref={layoutRef}
				className="market-layout"
				style={{ display: "flex", flex: 1, minHeight: 0, gap: compact ? 0 : 16 }}
			>
				<MarketResults vm={vm} compact={compact} onOpenFilters={() => setMobileFilterOpen(true)} />

				<FilterSheet
					facets={vm.facets}
					resultCount={vm.items.length}
					{...vm.sheetProps}
					compact={compact}
					mobileOpen={mobileFilterOpen}
					onMobileOpenChange={setMobileFilterOpen}
				/>
			</div>
		</div>
	);
}
