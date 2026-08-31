import { queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export function itemDetailQuery(id: number) {
	return queryOptions({
		queryKey: ["items", id, "detail"],
		queryFn: () =>
			client.items[":id"].$get({ param: { id: String(id) } }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
		staleTime: 60_000,
	});
}

export function itemCraftingInfoQuery(id: number) {
	return queryOptions({
		queryKey: ["items", id, "crafting-info"],
		queryFn: () =>
			client.items[":id"]["crafting-info"].$get({ param: { id: String(id) } }).then((r) => (r.ok ? r.json() : null)),
		staleTime: 60_000,
	});
}

export function itemBreakdownQuery(id: number) {
	return queryOptions({
		queryKey: ["items", id, "breakdown"],
		queryFn: () =>
			client.items[":id"].breakdown.$get({ param: { id: String(id) } }).then((r) => (r.ok ? r.json() : null)),
		staleTime: 60_000,
	});
}

export function priceHistoryQuery(itemId: number, days: "1" | "7" | "30") {
	return queryOptions({
		queryKey: ["auctions", itemId, "history", days],
		queryFn: () =>
			client.auctions[":itemId"].history
				.$get({ param: { itemId: String(itemId) }, query: { days } })
				.then((r) => (r.ok ? r.json() : null)),
		staleTime: 60_000,
	});
}

export function itemListingsQuery(itemId: number) {
	return queryOptions({
		queryKey: ["auctions", itemId, "listings"],
		queryFn: () =>
			client.auctions[":itemId"].listings
				.$get({ param: { itemId: String(itemId) } })
				.then((r) => (r.ok ? r.json() : null)),
		staleTime: 60_000,
	});
}
