import { sql } from "kysely";
import { db } from "../../database/db";

export async function getCurrentListings(itemId: number) {
	const latest = await db
		.selectFrom("auction_listings")
		.select(sql<number | null>`MAX(timestamp)`.as("ts"))
		.where("item_id", "=", itemId)
		.executeTakeFirst();

	if (!latest?.ts) return { itemId, timestamp: null, listings: [] };

	const listings = await db
		.selectFrom("auction_listings")
		.select(["count", "buyout_price", sql<number>`buyout_price / NULLIF(count, 0)`.as("unit_price")])
		.where("item_id", "=", itemId)
		.where("timestamp", "=", latest.ts)
		.orderBy(sql`buyout_price / NULLIF(count, 0)`, "asc")
		.execute();

	return { itemId, timestamp: latest.ts, listings };
}

export async function getPriceHistory(itemId: number, days: number) {
	const since = Math.floor(Date.now() / 1000) - days * 86400;
	const rows = await db
		.selectFrom("auction_listings")
		.select([
			"timestamp",
			sql<number | null>`MIN(buyout_price / NULLIF(count, 0))`.as("price"),
			sql<number>`CAST(SUM(count) AS INTEGER)`.as("volume"),
		])
		.where("item_id", "=", itemId)
		.where("timestamp", ">=", since)
		.groupBy("timestamp")
		.orderBy("timestamp", "asc")
		.execute();

	const prices = rows.map((r) => r.price).filter((p): p is number => p != null);
	return {
		itemId,
		points: rows.map((r) => ({ timestamp: r.timestamp, price: r.price, volume: r.volume })),
		minPrice: prices.length ? Math.min(...prices) : null,
		maxPrice: prices.length ? Math.max(...prices) : null,
		avgPrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
	};
}
