import { type Kysely, sql } from "kysely";

const ITEMS_TABLE = (secondThird: string) => `CREATE TABLE items (
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
	${secondThird},
	group_volume integer NOT NULL DEFAULT 0,
	craft_cost real,
	disenchant_value real,
	profit_absolute real,
	profit_margin_percent real,
	is_craftable integer NOT NULL DEFAULT 0,
	is_reagent integer NOT NULL DEFAULT 0,
	is_disenchantable integer NOT NULL DEFAULT 0,
	is_disenchant_result integer NOT NULL DEFAULT 0
)`;

const ITEMS_INDEXES = [
	`CREATE INDEX items_name_index ON items (name)`,
	`CREATE INDEX items_market_price_index ON items (market_price)`,
	`CREATE INDEX items_craft_cost_index ON items (craft_cost)`,
	`CREATE INDEX items_is_craftable_index ON items (is_craftable)`,
	`CREATE INDEX items_is_reagent_index ON items (is_reagent)`,
	`CREATE INDEX items_is_disenchantable_index ON items (is_disenchantable)`,
	`CREATE INDEX items_is_disenchant_result_index ON items (is_disenchant_result)`,
];

const statements: string[] = [
	`DROP TABLE items`,
	ITEMS_TABLE("second_market_price real,\n\tthird_market_price real"),
	...ITEMS_INDEXES,
];

const downStatements: string[] = [
	`DROP TABLE items`,
	ITEMS_TABLE("previous_market_price real,\n\tprevious_volume integer NOT NULL DEFAULT 0"),
	...ITEMS_INDEXES,
];

export async function up(db: Kysely<any>) {
	for (const statement of statements) await sql.raw(statement).execute(db);
}

export async function down(db: Kysely<any>) {
	for (const statement of downStatements) await sql.raw(statement).execute(db);
}
