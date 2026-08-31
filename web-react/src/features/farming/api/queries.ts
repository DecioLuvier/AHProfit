import { queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export const farmRoutesQuery = queryOptions({
	queryKey: ["farming", "routes"],
	queryFn: () => client.farming.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 30_000,
});

export function farmRouteDetailQuery(id: number) {
	return queryOptions({
		queryKey: ["farming", id, "detail"],
		queryFn: () =>
			client.farming[":id"].$get({ param: { id: String(id) } }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
		staleTime: 30_000,
	});
}

export function farmCraftingOpportunitiesQuery(id: number) {
	return queryOptions({
		queryKey: ["farming", id, "crafting-opportunities"],
		queryFn: () =>
			client.farming[":id"]["crafting-opportunities"]
				.$get({ param: { id: String(id) } })
				.then((r) => (r.ok ? r.json() : Promise.reject(r))),
		staleTime: 30_000,
	});
}
