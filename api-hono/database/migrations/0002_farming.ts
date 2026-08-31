import { type Kysely, sql } from "kysely";

const statements: string[] = [
	`CREATE TABLE farm_routes (
		id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
		name text NOT NULL UNIQUE,
		run_at integer NOT NULL
	)`,

	`CREATE TABLE farm_route_results (
		farm_route_id integer NOT NULL,
		item_id integer NOT NULL,
		per_hour real NOT NULL,
		PRIMARY KEY (farm_route_id, item_id)
	)`,
	`CREATE INDEX farm_route_results_item_id_index ON farm_route_results (item_id)`,
];

const downStatements: string[] = [`DROP TABLE IF EXISTS farm_route_results`, `DROP TABLE IF EXISTS farm_routes`];

export async function up(db: Kysely<any>) {
	for (const statement of statements) await sql.raw(statement).execute(db);
}

export async function down(db: Kysely<any>) {
	for (const statement of downStatements) await sql.raw(statement).execute(db);
}
