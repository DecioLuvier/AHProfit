import { useLayoutEffect, useRef, useState } from "react";
import { FilterSheet } from "@/features/market/components/FilterSheet";
import { MarketResults, type MarketLayout } from "@/features/market/components/MarketResults";
import { useMarketTable } from "@/features/market/hooks/useMarketTable";

/* Exatamente 3 modos, cada um com UM número (corte seco, sem histerese, sem
   estados intermediários). A largura medida é a da área de conteúdo (.market-layout).
   - "full"    ≥ 1240 : tabela + painel de filtros abertos lado a lado
   - "wide"    820–1240: tabela em largura cheia, filtros no botão "Options"
   - "compact" < 820   : lista em cards, filtros no botão "Options" */
const WIDE_BELOW = 1240;
const COMPACT_BELOW = 820;

export function MarketPage() {
	const vm = useMarketTable();
	const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

	const layoutRef = useRef<HTMLDivElement>(null);
	const [layout, setLayout] = useState<MarketLayout>("full");
	useLayoutEffect(() => {
		const el = layoutRef.current;
		if (!el) return;
		let raf = 0;
		let lastW = -1;
		const measure = () => {
			raf = 0;
			const w = el.clientWidth;
			// Só reage a mudança de LARGURA — mudanças de altura (header compacto,
			// scrollbar…) não devem re-disparar o cálculo e causar flicker.
			if (w === lastW) return;
			lastW = w;
			setLayout(w < COMPACT_BELOW ? "compact" : w < WIDE_BELOW ? "wide" : "full");
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

	const overlayFilters = layout !== "full";

	return (
		<div className="view-fill">
			<div
				ref={layoutRef}
				className="market-layout"
				style={{ display: "flex", flex: 1, minHeight: 0, gap: overlayFilters ? 0 : 16 }}
			>
				<MarketResults vm={vm} layout={layout} onOpenFilters={() => setMobileFilterOpen(true)} />

				<FilterSheet
					facets={vm.facets}
					resultCount={vm.items.length}
					{...vm.sheetProps}
					compact={overlayFilters}
					mobileOpen={mobileFilterOpen}
					onMobileOpenChange={setMobileFilterOpen}
				/>
			</div>
		</div>
	);
}
