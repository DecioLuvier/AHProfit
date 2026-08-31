import { type Kysely, sql } from "kysely";

const statements: string[] = [
	`CREATE TABLE items_catalog (
		id integer NOT NULL PRIMARY KEY,
		name text NOT NULL,
		quality text NOT NULL DEFAULT 'Common',
		quality_tier integer,
		icon text NOT NULL DEFAULT 'inv_misc_questionmark',
		expansion text NOT NULL DEFAULT 'Unknown',
		slot text NOT NULL DEFAULT 'Unknown',
		item_class text NOT NULL DEFAULT 'Unknown',
		item_subclass text NOT NULL DEFAULT 'Unknown',
		sell_price real
	)`,
	`CREATE INDEX items_catalog_name_index ON items_catalog (name)`,

	`CREATE TABLE item_crafting (
		item_id integer NOT NULL,
		reagent_id integer NOT NULL,
		quantity integer NOT NULL DEFAULT 1,
		PRIMARY KEY (item_id, reagent_id)
	)`,
	`CREATE INDEX item_crafting_reagent_id_index ON item_crafting (reagent_id)`,

	`CREATE TABLE item_disenchanting (
		item_id integer NOT NULL,
		disenchant_item_id integer NOT NULL,
		chance_percent real NOT NULL,
		PRIMARY KEY (item_id, disenchant_item_id)
	)`,
	`CREATE INDEX item_disenchanting_disenchant_item_id_index ON item_disenchanting (disenchant_item_id)`,

	`CREATE TABLE item_variants (
		item_id integer NOT NULL PRIMARY KEY,
		group_id integer NOT NULL
	)`,
	`CREATE INDEX item_variants_group_id_index ON item_variants (group_id)`,

	`CREATE TABLE auction_listings (
		timestamp integer NOT NULL,
		item_id integer NOT NULL,
		count integer NOT NULL DEFAULT 1,
		buyout_price real NOT NULL
	)`,
	`CREATE INDEX auction_listings_item_id_timestamp_index ON auction_listings (item_id, timestamp, count, buyout_price)`,
	`CREATE INDEX auction_listings_timestamp_index ON auction_listings (timestamp)`,

	`CREATE TABLE craft_costs (
		item_id integer NOT NULL PRIMARY KEY,
		craft_cost real
	)`,

	`CREATE TABLE items (
		id integer NOT NULL PRIMARY KEY,
		name text NOT NULL,
		quality text NOT NULL,
		quality_tier integer,
		icon text NOT NULL,
		expansion text NOT NULL,
		slot text NOT NULL,
		item_class text NOT NULL,
		item_subclass text NOT NULL,
		sell_price real,
		last_timestamp integer,
		market_price real,
		market_volume integer NOT NULL DEFAULT 0,
		previous_market_price real,
		previous_volume integer NOT NULL DEFAULT 0,
		group_volume integer NOT NULL DEFAULT 0,
		craft_cost real,
		disenchant_value real,
		profit_absolute real,
		profit_margin_percent real,
		is_craftable integer NOT NULL DEFAULT 0,
		is_reagent integer NOT NULL DEFAULT 0,
		is_disenchantable integer NOT NULL DEFAULT 0,
		is_disenchant_result integer NOT NULL DEFAULT 0
	)`,
	`CREATE INDEX items_name_index ON items (name)`,
	`CREATE INDEX items_market_price_index ON items (market_price)`,
	`CREATE INDEX items_craft_cost_index ON items (craft_cost)`,
	`CREATE INDEX items_is_craftable_index ON items (is_craftable)`,
	`CREATE INDEX items_is_reagent_index ON items (is_reagent)`,
	`CREATE INDEX items_is_disenchantable_index ON items (is_disenchantable)`,
	`CREATE INDEX items_is_disenchant_result_index ON items (is_disenchant_result)`,
];

const downStatements: string[] = [
	`DROP TABLE IF EXISTS items`,
	`DROP TABLE IF EXISTS craft_costs`,
	`DROP TABLE IF EXISTS auction_listings`,
	`DROP TABLE IF EXISTS item_variants`,
	`DROP TABLE IF EXISTS item_disenchanting`,
	`DROP TABLE IF EXISTS item_crafting`,
	`DROP TABLE IF EXISTS items_catalog`,
];

export async function up(db: Kysely<any>) {
	for (const statement of statements) await sql.raw(statement).execute(db);
}

export async function down(db: Kysely<any>) {
	for (const statement of downStatements) await sql.raw(statement).execute(db);
}
