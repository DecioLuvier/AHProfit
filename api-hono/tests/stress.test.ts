import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CATALOG = Number(process.env.STRESS_CATALOG ?? 200_000);
const SNAPSHOTS = Number(process.env.STRESS_SNAPSHOTS ?? 80);
const PER_SNAP = Number(process.env.STRESS_PER_SNAP ?? 300_000);
const CRAFT_STEP = 2;
const TOTAL_LISTINGS = SNAPSHOTS * PER_SNAP;

const dir = await mkdtemp(join(tmpdir(), "ahprofit-stress-"));
process.env.SQLITE_PATH = join(dir, "stress.sqlite");

const { db } = await import("../database/db");
const { sql } = await import("kysely");
const { recomputeMarket: rebuildMaterializedItems } = await import("../modules/items/service.market");
const itemsSvc = await import("../modules/items/service.read");
const { getBreakdown } = await import("../modules/items/service.breakdown");
const auctionsSvc = await import("../modules/auctions/service.read");
const farmSvc = await import("../modules/farming/service.read");
const charSvc = await import("../modules/characters/service.read");
const { getDataSummary } = await import("../modules/items/service.read");
const { wipeAuctions, enforceListingsRetention } = await import("../modules/auctions/service.write");

const raw = (q: string) => sql.raw(q).execute(db);
const timings: Record<string, number> = {};
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const t0 = performance.now();
	const out = await fn();
	timings[label] = Math.round(performance.now() - t0);
	return out;
}

beforeAll(async () => {
	console.log(
		`seeding: catalog=${CATALOG} snapshots=${SNAPSHOTS} perSnap=${PER_SNAP} auction_listings=${TOTAL_LISTINGS.toLocaleString()}`,
	);

	await raw(`
		INSERT INTO items_catalog (id, name, quality, quality_tier, icon, expansion, slot, item_class, item_subclass, sell_price)
		WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM seq WHERE i < ${CATALOG})
		SELECT i,
			'Item ' || (CASE WHEN i % 20 = 0 THEN i - (i % 40) ELSE i END),
			(CASE i % 5 WHEN 0 THEN 'Poor' WHEN 1 THEN 'Common' WHEN 2 THEN 'Uncommon' WHEN 3 THEN 'Rare' ELSE 'Epic' END),
			i % 5, 'icon_' || (i % 500), 'Expansion ' || (i % 10),
			(CASE i % 5 WHEN 0 THEN 'Head' WHEN 1 THEN 'Chest' WHEN 2 THEN 'Legs' WHEN 3 THEN 'Weapon' ELSE 'None' END),
			'Class ' || (i % 15), 'Sub ' || (i % 40), (i * 7 % 100000) * 1.0
		FROM seq`);

	await raw(`
		INSERT OR IGNORE INTO item_crafting (item_id, reagent_id, quantity)
		WITH RECURSIVE items(i) AS (SELECT ${CRAFT_STEP} UNION ALL SELECT i + ${CRAFT_STEP} FROM items WHERE i + ${CRAFT_STEP} <= ${CATALOG}),
			gen(g) AS (SELECT 0 UNION ALL SELECT g+1 FROM gen WHERE g < 3)
		SELECT item_id, reagent_id, quantity FROM (
			SELECT i AS item_id,
				CASE
					WHEN g = 0 AND i > ${CRAFT_STEP} THEN i - ${CRAFT_STEP}
					WHEN g = 2 AND i % 500 = 0 AND i + ${CRAFT_STEP} <= ${CATALOG} THEN i + ${CRAFT_STEP}
					ELSE 1 + ((i * 31 + g * 97) % (${CATALOG} - 1))
				END AS reagent_id,
				1 + ((i + g) % 4) AS quantity
			FROM items CROSS JOIN gen
		) WHERE reagent_id BETWEEN 1 AND ${CATALOG} AND reagent_id <> item_id`);

	await raw(`
		INSERT OR IGNORE INTO item_disenchanting (item_id, disenchant_item_id, chance_percent)
		WITH RECURSIVE items(i) AS (SELECT 1 UNION ALL SELECT i + 8 FROM items WHERE i + 8 <= ${CATALOG}),
			gen(k) AS (SELECT 0 UNION ALL SELECT k+1 FROM gen WHERE k < 2)
		SELECT i, 1 + ((i * 13 + k * 501) % (${CATALOG} - 1)), (10 + (i + k) % 80) * 1.0
		FROM items CROSS JOIN gen
		WHERE 1 + ((i * 13 + k * 501) % (${CATALOG} - 1)) <> i`);

	await raw(`DROP INDEX IF EXISTS auction_listings_item_id_timestamp_index`);
	await raw(`DROP INDEX IF EXISTS auction_listings_timestamp_index`);
	const nowSec = Math.floor(Date.now() / 1000);
	const snapTs = (s: number) =>
		s < 7
			? nowSec - s * 86400
			: s < 39
				? nowSec - 7 * 86400 - (s - 7) * 2 * 86400
				: nowSec - 60 * 86400 - (s - 39) * 30 * 86400;
	await timed("seed auction_listings", async () => {
		for (let s = 0; s < SNAPSHOTS; s++) {
			await raw(`
				INSERT INTO auction_listings (timestamp, item_id, count, buyout_price)
				WITH RECURSIVE nums(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM nums WHERE n < ${PER_SNAP} - 1)
				SELECT ${snapTs(s)},
					1 + CAST((abs(random())/9223372036854775807.0) * (abs(random())/9223372036854775807.0) * (${CATALOG}-1) AS INT),
					1 + (abs(random()) % 19),
					round((abs(random()) % 100000 + 1) * (1 + ${s}*0.003), 2)
				FROM nums`);
			if ((s + 1) % 10 === 0 || s === SNAPSHOTS - 1) console.log(`  seeded snapshot ${s + 1}/${SNAPSHOTS}`);
		}
	});
	console.log("  [probe] seed done, creating indexes");
	await timed("recreate auction indexes", async () => {
		await raw(
			`CREATE INDEX auction_listings_item_id_timestamp_index ON auction_listings (item_id, timestamp, count, buyout_price)`,
		);
		console.log("  [probe] index 1 done");
		await raw(`CREATE INDEX auction_listings_timestamp_index ON auction_listings (timestamp)`);
		console.log("  [probe] index 2 done");
	});
	await raw(
		`INSERT INTO auction_batches (timestamp, count) SELECT timestamp, count(*) FROM auction_listings GROUP BY timestamp`,
	);

	console.log("  [probe] indexes done, seeding characters/farm");
	await raw(`
		INSERT INTO characters (id, name, realm, race, class, gender, current_gold, last_synced_at)
		WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i < 50)
		SELECT i, 'Char ' || i, 'Realm ' || (i%4), 'Race ' || (i%10), 'Class ' || (i%12),
			(CASE i%2 WHEN 0 THEN 'M' ELSE 'F' END), i*1000, unixepoch('now') FROM c`);
	await raw(`
		INSERT INTO character_snapshots (id, character_id, timestamp, gold)
		WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i < 50),
			s(k) AS (SELECT 0 UNION ALL SELECT k+1 FROM s WHERE k < 11)
		SELECT (i-1)*12 + k + 1, i, unixepoch('now') - k*20*86400, i*1000 + k*50 FROM c CROSS JOIN s`);
	await raw(`
		INSERT INTO character_professions (character_id, profession_id, skill_level, max_skill_level, timestamp)
		WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i < 50),
			p(pid) AS (SELECT 164 UNION ALL SELECT pid+1 FROM p WHERE pid < 165),
			s(k) AS (SELECT 0 UNION ALL SELECT k+1 FROM s WHERE k < 5)
		SELECT i, pid, 100 + k*20, 300, unixepoch('now') - k*20*86400 FROM c CROSS JOIN p CROSS JOIN s`);
	await raw(`
		INSERT INTO inventory_snapshots (timestamp, item_id, count, character_snapshot_id, location)
		WITH RECURSIVE cs(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM cs WHERE id < 600),
			n(j) AS (SELECT 0 UNION ALL SELECT j+1 FROM n WHERE j < 199)
		SELECT unixepoch('now') - ((id-1) % 12)*20*86400, 1 + ((id*7 + j*13) % (${CATALOG}-1)), 1 + (j % 20), id,
			(CASE j%3 WHEN 0 THEN 'bag' WHEN 1 THEN 'bank' ELSE '' END)
		FROM cs CROSS JOIN n`);
	await raw(`
		INSERT OR IGNORE INTO inventory (character_id, item_id, count, location, updated_at)
		WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i < 50),
			n(j) AS (SELECT 0 UNION ALL SELECT j+1 FROM n WHERE j < 199)
		SELECT i, 1 + ((i*7 + j*13) % (${CATALOG}-1)), 1 + (j % 20), 'b' || (j % 40), unixepoch('now')
		FROM c CROSS JOIN n`);

	await raw(`
		INSERT INTO farm_routes (id, name, run_at)
		WITH RECURSIVE r(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM r WHERE i < 200)
		SELECT i, 'Route ' || i, unixepoch('now') - i*3600 FROM r`);
	await raw(`
		INSERT OR IGNORE INTO farm_route_results (farm_route_id, item_id, per_hour)
		WITH RECURSIVE r(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM r WHERE i < 200),
			n(j) AS (SELECT 0 UNION ALL SELECT j+1 FROM n WHERE j < 7)
		SELECT i, 1 + ((i*17 + j*29) % (${CATALOG}-1)), 10 + (abs(random()) % 300) FROM r CROSS JOIN n`);

	console.log("  [probe] starting ANALYZE");
	const _tA = performance.now();
	await raw(`ANALYZE`);
	console.log(`  [probe] ANALYZE done in ${Math.round(performance.now() - _tA)}ms; starting wal_checkpoint`);
	const _tC = performance.now();
	await sql`PRAGMA wal_checkpoint(TRUNCATE)`.execute(db);
	console.log(`  [probe] wal_checkpoint done in ${Math.round(performance.now() - _tC)}ms`);

	const counts = (
		await sql
			.raw(`SELECT
		(SELECT count(*) FROM items_catalog) catalog,
		(SELECT count(*) FROM item_crafting) crafting,
		(SELECT count(*) FROM auction_listings) listings,
		(SELECT count(DISTINCT timestamp) FROM auction_listings) snapshots,
		(SELECT count(*) FROM inventory_snapshots) inv_snaps`)
			.execute(db)
	).rows[0];
	console.log("seeded:", counts);
}, 2_400_000);

afterAll(async () => {
	console.log("\ntimings (ms):", timings);
	try {
		const size = (await stat(process.env.SQLITE_PATH!)).size;
		console.log(`.sqlite on disk: ${(size / 1024 / 1024).toFixed(0)} MB`);
	} catch {}
	await db.destroy();
	try {
		await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
	} catch {}
});

describe(`stress: ${TOTAL_LISTINGS.toLocaleString()} auction rows, ${CATALOG.toLocaleString()} items`, () => {
	it("rebuildMaterializedItems recomputes the whole catalog", async () => {
		await timed("rebuild (cold)", () => rebuildMaterializedItems());
		await timed("rebuild (warm)", () => rebuildMaterializedItems());
		const c = await itemsSvc.countItems();
		expect(c.total).toBe(CATALOG);
		expect(c.withPrice).toBeGreaterThan(0);
		expect(timings["rebuild (warm)"]).toBeLessThan(30_000);
	}, 300_000);

	it("every read path returns sane data and stays fast at scale", async () => {
		const hot = 1;
		const deep = Math.floor(30 / CRAFT_STEP) * CRAFT_STEP;

		const list = await timed("listItemsQuery heavy", () =>
			itemsSvc.listItemsQuery({
				search: "Item 1",
				quality: "Rare,Epic,Uncommon",
				minFlipPercent: 1,
				minMarginPercent: 1,
				minListedByName: 1,
				hasAuctionHousePrice: "true",
				sortBy: "flipPercent",
				sortDir: "desc",
				limit: 50,
			} as never),
		);
		expect(Array.isArray(list.items)).toBe(true);
		if (list.nextCursor) {
			const p2 = await itemsSvc.listItemsQuery({
				hasAuctionHousePrice: "true",
				sortBy: "flipPercent",
				sortDir: "desc",
				limit: 50,
				cursor: list.nextCursor,
			} as never);
			expect(Array.isArray(p2.items)).toBe(true);
		}

		expect(
			(await timed("getItemFilterOptions", () => itemsSvc.getItemFilterOptions())).itemClasses.length,
		).toBeGreaterThan(0);
		expect(await timed("getItem", () => itemsSvc.getItem(hot))).toBeDefined();
		expect((await timed("getCraftingInfo", () => itemsSvc.getCraftingInfo(deep)))?.item.id).toBe(deep);
		expect((await timed("getBreakdown", () => getBreakdown(deep)))?.tree.itemId).toBe(deep);
		expect(
			(await timed("getPriceHistory 3y", () => auctionsSvc.getPriceHistory(hot, 1095))).points.length,
		).toBeGreaterThan(0);
		expect(
			(await timed("getCurrentListings", () => auctionsSvc.getCurrentListings(hot))).listings.length,
		).toBeGreaterThan(0);

		expect((await timed("listFarmRoutes", () => farmSvc.listFarmRoutes())).length).toBe(200);
		expect((await timed("getFarmRoute", () => farmSvc.getFarmRoute(1)))?.results.length).toBeGreaterThan(0);
		await timed("getCraftingOpportunities", () => farmSvc.getCraftingOpportunities(1));

		expect((await timed("listCharacters", () => charSvc.listCharacters())).length).toBe(50);
		expect((await timed("getGoldHistory", () => charSvc.getGoldHistory(1))).length).toBeGreaterThan(0);
		expect((await timed("listProfessions", () => charSvc.listProfessions())).length).toBeGreaterThan(0);
		expect((await timed("listInventory", () => charSvc.listInventory())).length).toBeGreaterThan(0);
		const now = Math.floor(Date.now() / 1000);
		expect(
			(await timed("listInventorySnapshots", () => charSvc.listInventorySnapshots(0, now))).length,
		).toBeGreaterThan(0);

		const summary = await timed("getDataSummary", () => getDataSummary());
		expect(summary.items).toBe(CATALOG);
		expect(summary.auctionBatches.length).toBe(SNAPSHOTS);

		for (const [k, v] of Object.entries(timings)) {
			if (k.startsWith("seed") || k.startsWith("rebuild") || k.startsWith("recreate")) continue;
			expect(v, `${k} took ${v}ms`).toBeLessThan(3_000);
		}
	}, 300_000);

	it("an incremental snapshot import through the real route keeps retention at its ceiling", async () => {
		const { auctionRoutes } = await import("../modules/auctions/routes");
		const rows = Array.from({ length: 30_000 }, () => ({
			itemId: 1 + Math.floor(Math.random() * (CATALOG - 1)),
			count: 1,
			buyoutPrice: Math.round(Math.random() * 50000 + 1),
		}));
		const body = new Blob([Bun.gzipSync(new TextEncoder().encode(rows.map((r) => JSON.stringify(r)).join("\n")))]);
		const res = await auctionRoutes.request("/import", { method: "POST", body });
		expect(await res.text()).toContain("[done]");

		const snaps = (await sql`SELECT count(DISTINCT timestamp) AS n FROM auction_listings`.execute(db)).rows[0] as {
			n: number;
		};
		expect(snaps.n).toBeLessThanOrEqual(SNAPSHOTS + 1);
		expect((await itemsSvc.countItems()).total).toBe(CATALOG);
	}, 300_000);

	it("a scoped wipe of one snapshot recomputes cleanly", async () => {
		const oldest = (await sql`SELECT min(timestamp) AS t FROM auction_listings`.execute(db)).rows[0] as { t: number };
		await timed("wipeAuctions scoped", () => wipeAuctions(oldest.t));
		expect(
			(await sql`SELECT count(*) AS n FROM auction_listings WHERE timestamp = ${oldest.t}`.execute(db)).rows[0],
		).toMatchObject({ n: 0 });
		await enforceListingsRetention();
		expect((await itemsSvc.countItems()).total).toBe(CATALOG);
	}, 300_000);
});
