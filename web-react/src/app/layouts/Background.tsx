export function Background() {
	return (
		<div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0 }}>
			{/* Arte do hero — dessaturada, para virar textura e não competir com a UI */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage: "url(/assets/hero-bg.jpg)",
					backgroundSize: "cover",
					backgroundPosition: "center center",
					backgroundRepeat: "no-repeat",
					filter: "saturate(0.95) brightness(1.08)",
				}}
			/>
			{/* Scrim frio: vinheta que deixa a arte respirar pelas bordas sem competir */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(135% 135% at 50% 0%, oklch(0.12 0.02 275 / 0.26), oklch(0.08 0.018 278 / 0.58))",
				}}
			/>
		</div>
	);
}
