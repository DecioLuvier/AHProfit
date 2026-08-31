import type { AppType } from "api-hono/app";
import type { InferResponseType } from "hono/client";
import { hc } from "hono/client";

function resolveBaseUrl(): string {
	const fromQuery = new URLSearchParams(window.location.search).get("api");
	try {
		if (fromQuery) {
			localStorage.setItem("ahprofit.api", fromQuery);
			return fromQuery;
		}
		return localStorage.getItem("ahprofit.api") ?? "/api";
	} catch {
		return fromQuery ?? "/api";
	}
}

export const baseUrl = resolveBaseUrl();
export const client = hc<AppType>(baseUrl);

export type ListItemsResponse = InferResponseType<typeof client.items.$get, 200>;
export type ItemRow = ListItemsResponse["items"][number];

export type ItemDetail = InferResponseType<(typeof client.items)[":id"]["$get"], 200>;
export type ItemCraftingInfo = InferResponseType<(typeof client.items)[":id"]["crafting-info"]["$get"], 200>;
export type PriceHistoryResponse = InferResponseType<(typeof client.auctions)[":itemId"]["history"]["$get"], 200>;
export type ItemListingsResponse = InferResponseType<(typeof client.auctions)[":itemId"]["listings"]["$get"], 200>;
export type ItemListing = ItemListingsResponse["listings"][number];

export type ItemBreakdownResponse = InferResponseType<(typeof client.items)[":id"]["breakdown"]["$get"], 200>;
export type BreakdownNode = ItemBreakdownResponse["tree"];

export type ListCharactersResponse = InferResponseType<typeof client.characters.$get, 200>;
export type CharacterRow = ListCharactersResponse[number];
export type GoldHistory = InferResponseType<(typeof client.characters)[":id"]["gold-history"]["$get"], 200>;
export type ListCharacterProfessionsResponse = InferResponseType<typeof client.characters.professions.$get, 200>;
export type CharacterProfessionRow = ListCharacterProfessionsResponse[number];

export type ItemsCountResponse = InferResponseType<typeof client.items.count.$get, 200>;
export type ItemFilterOptionsResponse = InferResponseType<typeof client.items.filterOptions.$get, 200>;

export type ListInventoryResponse = InferResponseType<typeof client.inventory.$get, 200>;
export type InventoryRow = ListInventoryResponse[number];
export type InventorySnapshotsResponse = InferResponseType<
	(typeof client.inventory.characters)[":id"]["snapshots"]["$get"],
	200
>;
export type InventorySnapshotRow = InventorySnapshotsResponse[number];

export type ListFarmRoutesResponse = InferResponseType<typeof client.farming.$get, 200>;
export type FarmRouteRow = ListFarmRoutesResponse[number];
export type FarmRouteDetailResponse = InferResponseType<(typeof client.farming)[":id"]["$get"], 200>;
export type CraftingOpportunitiesResponse = InferResponseType<
	(typeof client.farming)[":id"]["crafting-opportunities"]["$get"],
	200
>;
export type CraftingOpportunity = CraftingOpportunitiesResponse[number];

export type DataSummaryResponse = InferResponseType<typeof client.items.summary.$get, 200>;
export type TimestampBatch = DataSummaryResponse["auctionBatches"][number];
