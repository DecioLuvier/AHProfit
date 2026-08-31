import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const MarketPage = lazy(() => import("@/pages/MarketPage").then((m) => ({ default: m.MarketPage })));
const FarmingPage = lazy(() => import("@/pages/FarmingPage").then((m) => ({ default: m.FarmingPage })));
const CharactersPage = lazy(() => import("@/pages/CharactersPage").then((m) => ({ default: m.CharactersPage })));
const ConfigPage = lazy(() => import("@/pages/ConfigPage").then((m) => ({ default: m.ConfigPage })));
const ItemDetailPage = lazy(() => import("@/pages/ItemDetailPage").then((m) => ({ default: m.ItemDetailPage })));

function PageFallback() {
	return <div style={{ flex: 1, minHeight: 0 }} />;
}

export function AppRoutes() {
	return (
		<div className="route-view">
			<Suspense fallback={<PageFallback />}>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/market" element={<MarketPage />} />
					<Route path="/farming" element={<FarmingPage />} />
					<Route path="/characters" element={<CharactersPage />} />
					<Route path="/config" element={<ConfigPage />} />
					<Route path="/items/:id" element={<ItemDetailPage />} />
				</Routes>
			</Suspense>
		</div>
	);
}
