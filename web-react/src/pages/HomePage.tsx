import { useQueries } from "@tanstack/react-query";
import { sidebarStatsQuery } from "@/features/dashboard/api/queries";
import { farmRoutesQuery } from "@/features/farming/api/queries";

function useHeroStats() {
	const [statsResult, farmResult] = useQueries({
		queries: [
			{ ...sidebarStatsQuery, throwOnError: false },
			{ ...farmRoutesQuery, throwOnError: false },
		],
	});
	return {
		characters: statsResult.data?.characterCount ?? null,
		ahListings: statsResult.data?.itemsInAuctionHouse ?? null,
		farmRoutes: farmResult.data?.length ?? null,
	};
}

function fmt(n: number | null): string {
	if (n === null) return "—";
	if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
	return String(n);
}

export function HomePage() {
	const stats = useHeroStats();

	const STATS = [
		{ value: fmt(stats.characters), label: "characters\nsynced" },
		{ value: fmt(stats.ahListings), label: "AH\nlistings" },
		{ value: fmt(stats.farmRoutes), label: "farm\nroutes" },
	];

	return (
		<div
			style={{
				flex: 1,
				minHeight: 0,
				display: "flex",
				alignItems: "center",
				padding: "0 clamp(16px, 5vw, 80px)",
				boxSizing: "border-box",
			}}
		>
			<div style={{ maxWidth: 560 }}>
				<p
					style={{
						fontSize: 11,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.14em",
						color: "var(--accent)",
						margin: "0 0 18px",
						display: "flex",
						alignItems: "center",
						gap: 10,
					}}
				>
					<span style={{ width: 24, height: 1, background: "var(--accent)", display: "inline-block" }} />
					Free &amp; open-source · WoW Community Project
				</p>

				<h1
					className="home-title"
					style={{
						fontFamily: "var(--font-display)",
						fontSize: 58,
						fontWeight: 800,
						lineHeight: 1.05,
						margin: "0 0 18px",
						letterSpacing: "0.01em",
						color: "var(--text)",
					}}
				>
					Your Workspace
					<br />
					for the <span style={{ color: "var(--accent)" }}>WoW Economy</span>
				</h1>

				<p
					style={{
						color: "var(--text-dim)",
						fontSize: 15,
						lineHeight: 1.65,
						margin: "0 0 52px",
					}}
				>
					Sync your entire roster, analyze live auction trends, and pinpoint profitable crafts in one unified dashboard.
				</p>

				<div style={{ display: "flex", alignItems: "center" }}>
					{STATS.map((s, i) => (
						<div key={s.label} style={{ display: "flex", alignItems: "center" }}>
							{i > 0 && <div style={{ width: 1, height: 40, background: "var(--border-soft)", margin: "0 32px" }} />}
							<div>
								<div
									style={{
										fontFamily: "var(--font-display)",
										fontSize: 34,
										fontWeight: 800,
										color: "var(--text)",
										lineHeight: 1,
										marginBottom: 5,
									}}
								>
									{s.value}
								</div>
								<div
									style={{
										fontSize: 10,
										color: "var(--text-dimmer)",
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										whiteSpace: "pre-line",
										lineHeight: 1.4,
									}}
								>
									{s.label}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
