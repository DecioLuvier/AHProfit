import { useLocation } from "react-router-dom";

export function Background() {
	const { pathname } = useLocation();
	const dimmed = pathname !== "/";

	return (
		<>
			<div
				aria-hidden="true"
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 0,
					backgroundImage: "url(/assets/hero-bg.png)",
					backgroundSize: "cover",
					backgroundPosition: "center center",
					backgroundRepeat: "no-repeat",
				}}
			/>
			<div
				aria-hidden="true"
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 0,
					background:
						"linear-gradient(180deg, oklch(0.08 0.03 270 / 0.18) 0%, oklch(0.07 0.04 280 / 0.40) 50%, oklch(0.06 0.025 270 / 0.62) 100%)",
				}}
			/>
			{dimmed && (
				<div
					aria-hidden="true"
					style={{ position: "fixed", inset: 0, zIndex: 0, background: "oklch(0.07 0.03 270 / 0.20)" }}
				/>
			)}
		</>
	);
}
