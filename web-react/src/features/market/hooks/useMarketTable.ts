import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { itemDetailQuery } from "@/features/items/api/queries";
import type { ItemRow } from "@/shared/api/client";
import { useCursor, usePersistentState } from "@/shared/hooks";
import { filterOptionsQuery, itemsCountQuery, itemsListQuery } from "../api/queries";
import { PAGE_SIZE, type SortKey } from "../model";
import { useMarketFilters } from "./useMarketFilters";

export function useMarketTable() {
	const { search, setSearch, params, itemClassParam, sheetProps } = useMarketFilters();
	const { cursor, canGoPrev, pageIndex, next, prev, reset } = useCursor("ah.cursor");

	const [sortBy, setSortBy] = usePersistentState<SortKey | "">("ah.sort.by", "");
	const [sortDir, setSortDir] = usePersistentState<"asc" | "desc">("ah.sort.dir", "desc");

	const handleSort = useCallback(
		(key: string) => {
			setSortBy((prevKey) => {
				if (prevKey !== key) {
					setSortDir("desc");
					reset();
					return key as SortKey;
				}
				if (sortDir === "desc") {
					setSortDir("asc");
					reset();
					return prevKey;
				}
				setSortDir("desc");
				reset();
				return "";
			});
		},
		[sortDir, reset],
	);

	const listParams = {
		limit: String(PAGE_SIZE),
		...(cursor ? { cursor } : {}),
		...params,
		...(sortBy ? { sortBy } : {}),
		sortDir,
	};

	const countQ = useQuery(itemsCountQuery);
	const facetsQ = useQuery(filterOptionsQuery(itemClassParam));
	const listQ = useQuery(itemsListQuery(listParams));

	const items: ItemRow[] = listQ.data?.items ?? [];
	const nextCursor = listQ.data?.nextCursor ?? null;
	const count = countQ.data ?? null;

	const rangeStart = items.length > 0 ? pageIndex * PAGE_SIZE + 1 : 0;
	const rangeEnd = pageIndex * PAGE_SIZE + items.length;
	const rangeLabel = count ? `${rangeStart}-${rangeEnd} of ~${count.total}` : undefined;

	const qc = useQueryClient();
	const prefetchItem = useCallback(
		(id: number) => {
			qc.prefetchQuery(itemDetailQuery(id));
			import("@/pages/ItemDetailPage");
		},
		[qc],
	);

	return {
		search,
		setSearch,
		items,
		facets: facetsQ.data ?? null,
		isInitialLoading: listQ.isPending,
		isFetching: listQ.isFetching,
		sortBy,
		sortDir,
		handleSort,
		prefetchItem,
		pagination: { nextCursor, canGoPrev, onNext: next, onPrev: prev, rangeLabel },
		sheetProps,
	};
}
