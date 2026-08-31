import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";

interface VirtualListProps<T> {
	items: T[];
	estimateSize?: number;
	overscan?: number;
	getKey?: (item: T, index: number) => string | number;
	renderItem: (item: T, index: number) => ReactNode;
	className?: string;
}

export function VirtualList<T>({
	items,
	estimateSize = 44,
	overscan = 8,
	getKey,
	renderItem,
	className,
}: VirtualListProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => estimateSize,
		overscan,
	});

	return (
		<div ref={parentRef} className={className} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
			<div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
				{virtualizer.getVirtualItems().map((v) => {
					const item = items[v.index];
					return (
						<div
							key={getKey ? getKey(item, v.index) : v.key}
							data-index={v.index}
							ref={virtualizer.measureElement}
							style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${v.start}px)` }}
						>
							{renderItem(item, v.index)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
