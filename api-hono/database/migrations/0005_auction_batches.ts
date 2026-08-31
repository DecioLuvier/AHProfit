import { type Kysely, sql } from "kysely";

const statements: string[] = [
	`CREATE TABLE auction_batches (
		timestamp integer NOT NULL PRIMARY KEY,
		count integer NOT NULL
	)`,
	`INSERT INTO auction_batches (timestamp, count)
		SELECT timestamp, count(*) FROM auction_listings GROUP BY timestamp`,
];

const downStatements: string[] = [`DROP TABLE auction_batches`];

export async function up(db: Kysely<any>) {
	for (const statement of statements) await sql.raw(statement).execute(db);
}

export async function down(db: Kysely<any>) {
	for (const statement of downStatements) await sql.raw(statement).execute(db);
}
