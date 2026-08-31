import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export const itemsCountQuery = queryOptions({
	queryKey: ["items", "count"],
	queryFn: () => client.items.count.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 60_000,
});

export function filterOptionsQuery(itemClass?: string) {
	return queryOptions({
		queryKey: ["items", "filterOptions", itemClass ?? null],
		queryFn: () =>
			client.items.filterOptions
				.$get({ query: { ...(itemClass ? { itemClass } : {}) } })
				.then((r) => (r.ok ? r.json() : Promise.reject(r))),
		staleTime: 120_000,
	});
}

export function itemsListQuery(params: Record<string, string | undefined>) {
	const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>;
	return queryOptions({
		queryKey: ["items", "list", clean],
		queryFn: () => client.items.$get({ query: clean }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});
}
