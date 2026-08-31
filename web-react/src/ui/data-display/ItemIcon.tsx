import { QUALITY_COLORS } from "@/shared/lib/constants";
import { iconUrl } from "@/shared/lib/format";

export interface ItemIconProps {
	icon: string | null | undefined;
	name?: string;
	quality?: string | null | undefined;
	qualityTier?: number | string | null | undefined;
	size?: number;
	borderRadius?: number;
	borderWidth?: number;
	className?: string;
	style?: React.CSSProperties;
	imgStyle?: React.CSSProperties;
}

export function ItemIcon({
	icon,
	name,
	quality,
	qualityTier,
	size = 32,
	borderRadius,
	borderWidth,
	className,
	style,
	imgStyle,
}: ItemIconProps) {
	const radius = borderRadius ?? (size <= 20 ? 3 : size <= 26 ? 4 : size <= 36 ? 6 : 8);
	const borderW = borderWidth ?? (size >= 48 ? 2 : 1);
	const color = (quality && QUALITY_COLORS[quality]) || "#9d9d9d";
	const tierNum = Number(qualityTier);
	const hasTier = tierNum >= 1 && tierNum <= 3;

	const baseTierSize = size <= 20 ? 11 : size <= 26 ? 14 : size <= 36 ? 17 : size <= 44 ? 22 : 24;
	const tierSize = tierNum === 1 ? Math.round(baseTierSize * 0.82) : baseTierSize;

	return (
		<div
			className={`item-icon-wrap ${className ?? ""}`.trim()}
			style={{
				position: "relative",
				display: "inline-flex",
				width: size,
				height: size,
				flexShrink: 0,
				...style,
			}}
		>
			<img
				src={iconUrl(icon)}
				alt={name ?? "Item"}
				width={size}
				height={size}
				style={{
					width: "100%",
					height: "100%",
					borderRadius: radius,
					border: `${borderW}px solid ${color}`,
					objectFit: "cover",
					display: "block",
					...imgStyle,
				}}
			/>
			{hasTier && (
				<img
					src={`/icons/quality/tier${tierNum}.png`}
					alt={`Tier ${tierNum}`}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: tierSize,
						height: tierSize,
						pointerEvents: "none",
						filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.95))",
						objectFit: "contain",
						objectPosition: "left top",
						transformOrigin: "top left",
					}}
				/>
			)}
		</div>
	);
}

export function QualityTierIcon({
	tier,
	size = 16,
	style,
}: {
	tier: number | string | null | undefined;
	size?: number;
	style?: React.CSSProperties;
}) {
	const t = Number(tier);
	if (!t || t < 1 || t > 3) return null;
	const actualSize = t === 1 ? Math.round(size * 0.82) : size;
	return (
		<img
			src={`/icons/quality/tier${t}.png`}
			alt={`Tier ${t}`}
			width={actualSize}
			height={actualSize}
			style={{
				display: "inline-block",
				verticalAlign: "middle",
				objectFit: "contain",
				filter: "drop-shadow(0 1.5px 3px rgba(0, 0, 0, 0.9))",
				...style,
			}}
		/>
	);
}
