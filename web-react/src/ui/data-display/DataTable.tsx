import { useLayoutEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/primitives/table";

export interface DataTableColumn<T> {
	key: string;
	header: string;
	render: (row: T) => React.ReactNode;
	colSpan?: number;
	align?: "left" | "right" | "center";
	sortKey?: string;
	width?: number | string;
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	rows: T[];
	getRowKey: (row: T) => string | number;
	emptyLabel?: string;
	sortBy?: string;
	sortDir?: "asc" | "desc";
	onSort?: (key: string) => void;
	onRowHover?: (row: T) => void;
	animateRows?: boolean;
	compact?: boolean;
	compactWidth?: number;
	rowAccent?: (row: T) => string | undefined;
}

export function DataTable<T>({
	columns,
	rows,
	getRowKey,
	emptyLabel,
	sortBy,
	sortDir,
	onSort,
	onRowHover,
	compact: forceCompact,
	compactWidth,
	rowAccent,
}: DataTableProps<T>) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [autoCompact, setAutoCompact] = useState(false);
	const compact = forceCompact ?? autoCompact;
	useLayoutEffect(() => {
		if (compactWidth == null) return;
		const el = rootRef.current;
		if (!el) return;
		const measure = () => setAutoCompact(el.clientWidth < compactWidth);
		const update = () => {
			measure();
			requestAnimationFrame(measure);
		};
		measure();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener("resize", update);
		document.addEventListener("visibilitychange", update);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", update);
			document.removeEventListener("visibilitychange", update);
		};
	}, [compactWidth]);

	if (compact) {
		return (
			<div ref={rootRef} style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
				<div className="datatable-compact" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
					{rows.length === 0 ? (
						emptyLabel ? (
							<div style={{ padding: "16px 10px", color: "var(--text-dimmer)", fontSize: 13, textAlign: "center" }}>
								{emptyLabel}
							</div>
						) : null
					) : (
						rows.map((row) => (
							<div
								key={getRowKey(row)}
								className="dt-card"
								onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
								style={rowAccent?.(row) ? { borderLeft: `3px solid ${rowAccent(row)}` } : undefined}
							>
								{columns.map((col) => (
									<div key={col.key} className="dt-card-line">
										<span className="dt-card-label">{col.header}</span>
										<span className="dt-card-value">{col.render(row)}</span>
									</div>
								))}
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	return (
		<div ref={rootRef} style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
			<div
				style={{
					flex: 1,
					minHeight: 0,
					minWidth: 0,
					overflowY: "auto",
					overflowX: compactWidth != null ? "hidden" : "auto",
				}}
				className="bagscroll datatable-scroll"
			>
				<Table className="min-w-0" style={columns.some((c) => c.width != null) ? { tableLayout: "fixed" } : undefined}>
					{columns.some((c) => c.width != null) && (
						<colgroup>
							{columns.map((col) => (
								<col
									key={col.key}
									style={
										col.width != null
											? { width: typeof col.width === "number" ? `${col.width}px` : col.width }
											: undefined
									}
								/>
							))}
						</colgroup>
					)}
					<TableHeader className="sticky top-0 z-[2]">
						<TableRow>
							{columns.map((col) => {
								const active = !!col.sortKey && col.sortKey === sortBy;
								const headStyle: React.CSSProperties = {
									textAlign: col.align ?? "left",
									fontSize: 10,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.07em",
									color: active ? "var(--accent-strong)" : "var(--text-dimmer)",
									padding: 0,
									background: "var(--panel-head-solid)",
									borderBottom: "1px solid var(--border-soft)",
								};
								if (!col.sortKey) {
									return (
										<TableHead key={col.key} style={{ ...headStyle, padding: "9px 10px" }}>
											{col.header}
										</TableHead>
									);
								}
								return (
									<TableHead key={col.key} style={headStyle}>
										<button
											type="button"
											onClick={() => onSort?.(col.sortKey as string)}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 4,
												width: "100%",
												justifyContent:
													col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
												padding: "9px 10px",
												background: "none",
												border: "none",
												cursor: "pointer",
												color: "inherit",
												font: "inherit",
												letterSpacing: "inherit",
												textTransform: "inherit",
												fontSize: "inherit",
												fontWeight: "inherit",
											}}
										>
											{col.header}
											<span
												style={{
													fontSize: 9,
													display: "inline-block",
													opacity: active ? 0.8 : 0,
													transform: active && sortDir === "asc" ? "rotate(0deg)" : "rotate(180deg)",
												}}
											>
												▲
											</span>
										</button>
									</TableHead>
								);
							})}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 && emptyLabel && (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									style={{ padding: "16px 10px", color: "var(--text-dimmer)", fontSize: 13, textAlign: "center" }}
								>
									{emptyLabel}
								</TableCell>
							</TableRow>
						)}
						{rows.map((row) => {
							const key = getRowKey(row);
							const cells: React.ReactNode[] = [];
							for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
								const col = columns[columnIndex];
								cells.push(
									<TableCell
										key={col.key}
										colSpan={col.colSpan}
										style={{
											textAlign: col.align ?? "left",
											padding: "9px 10px",
											fontSize: 13,
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{col.render(row)}
									</TableCell>,
								);
								columnIndex += (col.colSpan ?? 1) - 1;
							}
							const accent = rowAccent?.(row);
							return (
								<TableRow
									key={key}
									className="data-row"
									onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
									style={{
										borderBottom: "1px solid var(--border-soft)",
										...(accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : {}),
									}}
								>
									{cells}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
