import { type Kysely, sql } from "kysely";

const statements: string[] = [
	`CREATE TABLE characters (
		id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
		name text NOT NULL,
		realm text NOT NULL,
		race text NOT NULL,
		class text NOT NULL,
		gender text NOT NULL,
		current_gold integer NOT NULL DEFAULT 0,
		last_synced_at integer,
		UNIQUE (name, realm)
	)`,

	`CREATE TABLE character_snapshots (
		id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
		character_id integer NOT NULL,
		timestamp integer NOT NULL,
		gold integer NOT NULL
	)`,
	`CREATE INDEX character_snapshots_character_id_timestamp_index ON character_snapshots (character_id, timestamp)`,

	`CREATE TABLE character_professions (
		id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
		character_id integer NOT NULL,
		profession_id integer NOT NULL,
		skill_level integer NOT NULL,
		max_skill_level integer NOT NULL,
		timestamp integer NOT NULL,
		UNIQUE (character_id, profession_id, timestamp)
	)`,
	`CREATE INDEX character_professions_character_id_index ON character_professions (character_id)`,

	`CREATE TABLE inventory (
		character_id integer NOT NULL,
		item_id integer NOT NULL,
		count integer NOT NULL DEFAULT 1,
		location text NOT NULL DEFAULT '',
		updated_at integer NOT NULL,
		PRIMARY KEY (character_id, item_id, location)
	)`,
	`CREATE INDEX inventory_item_id_index ON inventory (item_id)`,

	`CREATE TABLE inventory_snapshots (
		timestamp integer NOT NULL,
		item_id integer NOT NULL,
		count integer NOT NULL DEFAULT 1,
		character_snapshot_id integer NOT NULL,
		location text
	)`,
	`CREATE INDEX inventory_snapshots_item_id_timestamp_index ON inventory_snapshots (item_id, timestamp)`,
	`CREATE INDEX inventory_snapshots_character_snapshot_id_index ON inventory_snapshots (character_snapshot_id)`,
];

const downStatements: string[] = [
	`DROP TABLE IF EXISTS inventory_snapshots`,
	`DROP TABLE IF EXISTS inventory`,
	`DROP TABLE IF EXISTS character_professions`,
	`DROP TABLE IF EXISTS character_snapshots`,
	`DROP TABLE IF EXISTS characters`,
];

export async function up(db: Kysely<any>) {
	for (const statement of statements) await sql.raw(statement).execute(db);
}

export async function down(db: Kysely<any>) {
	for (const statement of downStatements) await sql.raw(statement).execute(db);
}
