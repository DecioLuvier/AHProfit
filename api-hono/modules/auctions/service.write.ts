import { sql } from "kysely";
import { db, sqlite } from "../../database/db";
import { recomputeMarket } from "../items/service.market";
import type { AuctionRow } from "./contracts";

export async function insertAuctions(timestamp: number, rows: AuctionRow[]): Promise<void> {
	if (!rows.length) return;
	await sql`
		INSERT INTO auction_listings (timestamp, item_id, count, buyout_price)
		SELECT ${timestamp}, value ->> 'itemId', value ->> 'count', value ->> 'buyoutPrice'
		FROM json_each(${JSON.stringify(rows)})
	`.execute(db);
}

export async function enforceListingsRetention(timestamp?: number) {
	if (timestamp !== undefined)
		sqlite.run(
			`DELETE FROM auction_listings WHERE timestamp = ${timestamp} AND item_id NOT IN (SELECT id FROM items_catalog)`,
		);

	await sql`
		WITH snap AS (
			SELECT DISTINCT
				timestamp,
				CASE
					WHEN (unixepoch('now') - timestamp) < 7 * 86400  THEN 'D:' || strftime('%Y-%m-%d', timestamp, 'unixepoch')
					WHEN (unixepoch('now') - timestamp) < 60 * 86400 THEN 'W:' || strftime('%Y-%W', timestamp, 'unixepoch')
					ELSE 'M:' || strftime('%Y-%m', timestamp, 'unixepoch')
				END AS bucket,
				CASE
					WHEN (unixepoch('now') - timestamp) < 7 * 86400  THEN 1
					WHEN (unixepoch('now') - timestamp) < 60 * 86400 THEN 4
					ELSE 1
				END AS keep_n
			FROM auction_listings
		),
		ranked AS (
			SELECT timestamp, keep_n, row_number() OVER (PARTITION BY bucket ORDER BY timestamp DESC) AS rn FROM snap
		)
		DELETE FROM auction_listings
		WHERE timestamp NOT IN (SELECT timestamp FROM ranked WHERE rn <= keep_n)
	`.execute(db);
}

export function refreshAuctionBatches() {
	sqlite.run(`
		DELETE FROM auction_batches;
		INSERT INTO auction_batches (timestamp, count)
			SELECT timestamp, count(*) FROM auction_listings GROUP BY timestamp;
	`);
}

export async function refreshAuctions(timestamp?: number) {
	await enforceListingsRetention(timestamp);
	refreshAuctionBatches();
	await recomputeMarket();
}

export async function wipeAuctions(timestamp?: number) {
	let q = db.deleteFrom("auction_listings");
	if (timestamp !== undefined) q = q.where("timestamp", "=", timestamp);
	await q.execute();
	await refreshAuctions();
}
