import type { ItemRow } from "@/shared/api/client";

export const PAGE_SIZE = 20;

export type SortKey =
	| "name"
	| "marketPrice"
	| "craftCost"
	| "disenchantValue"
	| "groupVolume"
	| "flipPercent"
	| "profitMarginPercent"
	| "quality";

export function flipPercent(item: ItemRow): number | null {
	if (item.market_price == null || item.market_price === 0 || item.second_market_price == null) return null;
	return ((item.second_market_price - item.market_price) / item.market_price) * 100;
}
