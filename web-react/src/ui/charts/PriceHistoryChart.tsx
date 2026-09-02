import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtGold, fmtTime } from "@/shared/lib/format";

export interface RadarChartPoint {
	timestamp: number;
	price: number;
	craftCost: number | null;
	volume: number;
}

interface TooltipPayloadEntry {
	dataKey: string;
	name: string;
	value: number;
	color: string;
}

function ChartTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipPayloadEntry[];
	label?: number;
}) {
	if (!active || !payload || payload.length === 0) return null;
	return (
		<div
			style={{
				background: "var(--panel-head)",
				border: "1px solid var(--border)",
				borderRadius: 8,
				padding: "8px 12px",
				fontSize: 12,
			}}
		>
			<div style={{ color: "var(--text-dim)", marginBottom: 4 }}>{fmtTime(label)}</div>
			{payload.map((p) => (
				<div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
					{p.name}: {p.dataKey === "volume" ? p.value : fmtGold(p.value)}
				</div>
			))}
		</div>
	);
}

export function RadarChart({
	data,
	hasCraftCost,
	height = 260,
}: {
	data: RadarChartPoint[];
	hasCraftCost: boolean;
	height?: number | string;
}) {
	if (data.length === 0) return <p style={{ color: "var(--text-dim)", margin: 0 }}>No history.</p>;

	return (
		<ResponsiveContainer width="100%" height={height}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
				<CartesianGrid stroke="var(--border-soft)" vertical={false} />
				<XAxis
					dataKey="timestamp"
					tickFormatter={(v) => fmtTime(v)}
					stroke="var(--text-dimmer)"
					tick={{ fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					minTickGap={60}
				/>
				<YAxis yAxisId="gold" hide domain={["auto", "auto"]} />
				<YAxis yAxisId="volume" orientation="right" hide domain={["auto", "auto"]} />
				<Tooltip content={<ChartTooltip />} />
				<Line
					yAxisId="gold"
					type="monotone"
					dataKey="price"
					name="Price (Buyout)"
					stroke="var(--accent-strong)"
					strokeWidth={2.5}
					dot={false}
					activeDot={{ r: 4 }}
					isAnimationActive={false}
				/>
				{hasCraftCost && (
					<Line
						yAxisId="gold"
						type="monotone"
						dataKey="craftCost"
						name="Craft cost"
						stroke="oklch(0.72 0.13 200)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
						isAnimationActive={false}
					/>
				)}
				<Line
					yAxisId="volume"
					type="monotone"
					dataKey="volume"
					name="Supply / Volume"
					stroke="oklch(0.6 0.015 275)"
					strokeWidth={1.5}
					strokeDasharray="5 4"
					dot={false}
					activeDot={{ r: 4 }}
					isAnimationActive={false}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}

export function RadarChartLegend({ hasCraftCost }: { hasCraftCost: boolean }) {
	const items = [
		{ label: "Price (Buyout)", color: "var(--accent-strong)", dashed: false },
		...(hasCraftCost ? [{ label: "Craft cost", color: "oklch(0.72 0.13 200)", dashed: false }] : []),
		{ label: "Supply / Volume", color: "oklch(0.6 0.015 275)", dashed: true },
	];
	return (
		<div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
			{items.map((s) => (
				<div
					key={s.label}
					style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}
				>
					<svg width={18} height={2} style={{ flexShrink: 0 }}>
						<line
							x1={0}
							y1={1}
							x2={18}
							y2={1}
							stroke={s.color}
							strokeWidth={2}
							strokeDasharray={s.dashed ? "4 3" : undefined}
						/>
					</svg>
					{s.label}
				</div>
			))}
		</div>
	);
}
