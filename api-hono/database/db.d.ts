import type { ColumnType } from "kysely";

export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U> ? ColumnType<S, I | undefined, U> : ColumnType<T, T | undefined, T>;

export interface ItemsCatalog {
	id: number;
	name: string;
	quality: Generated<string>;
	quality_tier: number | null;
	icon: Generated<string>;
	expansion: Generated<string>;
	slot: Generated<string>;
	item_class: Generated<string>;
	item_subclass: Generated<string>;
	sell_price: number | null;
}

export interface ItemCrafting {
	item_id: number;
	reagent_id: number;
	quantity: Generated<number>;
}

export interface ItemDisenchanting {
	item_id: number;
	disenchant_item_id: number;
	chance_percent: number;
}

export interface ItemVariants {
	item_id: number;
	group_id: number;
}

export interface AuctionListings {
	timestamp: number;
	item_id: number;
	count: Generated<number>;
	buyout_price: number;
}

export interface AuctionBatches {
	timestamp: number;
	count: number;
}

export interface CraftCosts {
	item_id: number;
	craft_cost: number | null;
}

export interface Items {
	id: number;
	name: string;
	quality: string;
	quality_tier: number | null;
	icon: string;
	expansion: string;
	slot: string;
	item_class: string;
	item_subclass: string;
	sell_price: number | null;
	last_timestamp: number | null;
	market_price: number | null;
	market_volume: Generated<number>;
	second_market_price: number | null;
	third_market_price: number | null;
	group_volume: Generated<number>;
	craft_cost: number | null;
	disenchant_value: number | null;
	profit_absolute: number | null;
	profit_margin_percent: number | null;
	is_craftable: Generated<boolean>;
	is_reagent: Generated<boolean>;
	is_disenchantable: Generated<boolean>;
	is_disenchant_result: Generated<boolean>;
}

export interface FarmRoutes {
	id: Generated<number>;
	name: string;
	run_at: number;
}

export interface FarmRouteResults {
	farm_route_id: number;
	item_id: number;
	per_hour: number;
}

export interface Characters {
	id: Generated<number>;
	name: string;
	realm: string;
	race: string;
	class: string;
	gender: string;
	current_gold: Generated<number>;
	last_synced_at: number | null;
}

export interface CharacterSnapshots {
	id: Generated<number>;
	character_id: number;
	timestamp: number;
	gold: number;
}

export interface CharacterProfessions {
	id: Generated<number>;
	character_id: number;
	profession_id: number;
	skill_level: number;
	max_skill_level: number;
	timestamp: number;
}

export interface Inventory {
	character_id: number;
	item_id: number;
	count: Generated<number>;
	location: Generated<string>;
	updated_at: number;
}

export interface InventorySnapshots {
	timestamp: number;
	item_id: number;
	count: Generated<number>;
	character_snapshot_id: number;
	location: string | null;
}

export interface DB {
	auction_batches: AuctionBatches;
	auction_listings: AuctionListings;
	character_professions: CharacterProfessions;
	character_snapshots: CharacterSnapshots;
	characters: Characters;
	craft_costs: CraftCosts;
	farm_route_results: FarmRouteResults;
	farm_routes: FarmRoutes;
	inventory: Inventory;
	inventory_snapshots: InventorySnapshots;
	item_crafting: ItemCrafting;
	item_disenchanting: ItemDisenchanting;
	item_variants: ItemVariants;
	items: Items;
	items_catalog: ItemsCatalog;
}
