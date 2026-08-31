import { Code2, Gem, Pickaxe, Settings, Swords, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

export const NAV_ITEMS = [
	{ href: "/market", label: "Auction House", icon: Swords },
	{ href: "/farming", label: "Farming", icon: Pickaxe },
	{ href: "/characters", label: "Characters", icon: Users },
	{ href: "/config", label: "Config", icon: Settings },
];

export const PATREON_URL = "https://www.patreon.com/";
export const GITHUB_URL = "https://github.com/";

const ROUTE_CHUNK: Record<string, () => Promise<unknown>> = {
	"/": () => import("@/pages/HomePage"),
	"/market": () => import("@/pages/MarketPage"),
	"/farming": () => import("@/pages/FarmingPage"),
	"/characters": () => import("@/pages/CharactersPage"),
	"/config": () => import("@/pages/ConfigPage"),
};
function prefetchRoute(href: string) {
	ROUTE_CHUNK[href]?.();
}

export function Brand() {
	return (
		<span className="brand-mark">
			AH<span>Profit</span>
		</span>
	);
}

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
	return (
		<nav className="top-navigation" aria-label="Main navigation">
			{NAV_ITEMS.map((item) => {
				const Icon = item.icon;
				return (
					<NavLink
						key={item.href}
						to={item.href}
						onClick={onNavigate}
						onPointerEnter={() => prefetchRoute(item.href)}
						className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
					>
						<Icon size={16} strokeWidth={1.8} aria-hidden="true" />
						<span>{item.label}</span>
					</NavLink>
				);
			})}
		</nav>
	);
}

export function ExternalLinks() {
	return (
		<div className="navbar-actions">
			<a className="navbar-external navbar-patreon" href={PATREON_URL} target="_blank" rel="noopener noreferrer">
				<Gem size={15} aria-hidden="true" />
				<span>Patreon</span>
			</a>
			<a className="navbar-external navbar-github" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
				<Code2 size={15} aria-hidden="true" />
				<span>GitHub</span>
			</a>
		</div>
	);
}
