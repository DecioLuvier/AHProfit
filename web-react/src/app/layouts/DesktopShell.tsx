import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Brand, ExternalLinks, Navigation } from "./Navbar";

export function DesktopShell({ children }: { children: ReactNode }) {
	return (
		<div className="app-shell">
			<header className="app-navbar">
				<NavLink to="/" className="app-brand" aria-label="AnotherProfit home">
					<Brand />
				</NavLink>
				<div className="desktop-navigation">
					<Navigation />
				</div>
				<ExternalLinks />
			</header>
			<main className="app-main">{children}</main>
		</div>
	);
}
