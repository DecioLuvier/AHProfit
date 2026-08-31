import { Database } from "bun:sqlite";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "kysely";

process.env.SQLITE_PATH = ":memory:";

const { db } = await import("../database/db");
const { recomputeMarket: rebuildMaterializedItems } = await import("../modules/items/service.market");
const { itemRoutes } = await import("../modules/items/routes");
const { auctionRoutes } = await import("../modules/auctions/routes");
const { farmingRoutes } = await import("../modules/farming/routes");
const { characterRoutes, inventoryRoutes } = await import("../modules/characters/routes");
const items = await import("../modules/items/service.read");
const { getBreakdown } = await import("../modules/items/service.breakdown");
const auctionsSvc = await import("../modules/auctions/service.read");
const farmSvc = await import("../modules/farming/service.read");
const charSvc = await import("../modules/characters/service.read");
const { getDataSummary } = await import("../modules/items/service.read");
const { wipeItems } = await import("../modules/items/service.write");
const { wipeAuctions, enforceListingsRetention, refreshAuctionBatches } = await import(
	"../modules/auctions/service.write"
);
const { wipeCharacters, wipeInventorySnapshots } = await import("../modules/characters/service.write");
const { wipeFarmRoutes } = await import("../modules/farming/service.write");

type Result = { ok: boolean; status: number; rows?: number; skipped?: number; error?: string };

type Router = { request: (path: string, init?: RequestInit) => Response | Promise<Response> };
const gzip = (rows: unknown[]) =>
	new Blob([Bun.gzipSync(new TextEncoder().encode(rows.map((r) => JSON.stringify(r)).join("\n")))]);

async function post(router: Router, path: string, rows: unknown[]): Promise<Result> {
	const res = await router.request(path, { method: "POST", body: gzip(rows) });
	if (res.status !== 200) {
		const d = (await res.json().catch(() => ({}))) as { error?: string };
		return { ok: false, status: res.status, error: d.error };
	}
	let ok = false;
	let count = 0;
	let skipped = 0;
	let error: string | undefined;
	for (const l of (await res.text()).split("\n")) {
		const t = l.trim();
		if (!t) continue;
		const done = t.match(/^\[done\] Completed: (\d+) rows processed \((\d+) skipped\)/);
		if (done) (ok = true), (count = Number(done[1])), (skipped = Number(done[2]));
		else if (t.startsWith("[error]")) error = t.slice("[error] ".length);
	}
	return { ok: ok && !error, status: 200, rows: count, skipped, error };
}
const impItems = (rows: unknown[]) => post(itemRoutes, "/import", rows);
const impAuctions = (rows: unknown[]) => post(auctionRoutes, "/import", rows);
const impFarming = (rows: unknown[]) => post(farmingRoutes, "/import", rows);
const impChars = (rows: unknown[]) => post(characterRoutes, "/import", rows);
const impInv = (q: string, rows: unknown[]) => post(inventoryRoutes, `/import${q}`, rows);

async function seedAuctions(rows: { itemId: number; timestamp: number; count?: number; buyoutPrice: number }[]) {
	await db
		.insertInto("auction_listings")
		.values(
			rows.map((r) => ({
				timestamp: r.timestamp,
				item_id: r.itemId,
				count: r.count ?? 1,
				buyout_price: r.buyoutPrice,
			})),
		)
		.execute();
	await refreshAuctionBatches();
	await rebuildMaterializedItems();
}

const item = (r: Record<string, unknown>) => ({
	kind: "item",
	quality: "Common",
	qualityTier: 0,
	icon: "inv_misc_questionmark",
	expansion: "Unknown",
	slot: "Unknown",
	itemClass: "Unknown",
	itemSubclass: "Unknown",
	sellPrice: null,
	...r,
});
const crafting = (r: Record<string, unknown>) => ({ kind: "crafting", quantity: 1, ...r });
const disenchanting = (r: Record<string, unknown>) => ({ kind: "disenchanting", chancePercent: 0, ...r });

async function reset() {
	for (const t of [
		"inventory_snapshots",
		"inventory",
		"character_professions",
		"character_snapshots",
		"characters",
		"farm_route_results",
		"farm_routes",
		"item_crafting",
		"item_disenchanting",
		"item_variants",
		"auction_listings",
		"auction_batches",
		"craft_costs",
		"items_catalog",
	] as const) {
		await db.deleteFrom(t).execute();
	}
	await sql`DELETE FROM sqlite_sequence`.execute(db);
	await rebuildMaterializedItems();
}
beforeEach(reset);
afterAll(reset);

describe("items", () => {
	it("imports catalog/crafting/disenchant, normalizes defaults, and materializes prices + derived flags", async () => {
		const r = await impItems([
			item({ id: 1, name: "Sword", slot: "Weapon" }),
			item({ id: 2, name: "Bar" }),
			item({ id: 3, name: "Ore" }),
			item({ id: 4, name: "Gem" }),
			crafting({ itemId: 1, reagentItemId: 2, quantity: 2 }),
			crafting({ itemId: 2, reagentItemId: 3, quantity: 3 }),
			crafting({ itemId: 1, reagentItemId: 999, quantity: 1 }),
			disenchanting({ itemId: 1, disenchantItemId: 3, chancePercent: 50 }),
			disenchanting({ itemId: 1, disenchantItemId: 777, chancePercent: 10 }),
		]);
		expect(r.ok).toBe(true);

		await seedAuctions([
			{ itemId: 3, timestamp: 1000, buyoutPrice: 10, count: 1 },
			{ itemId: 3, timestamp: 1000, buyoutPrice: 40, count: 1 },
			{ itemId: 3, timestamp: 1000, buyoutPrice: 90, count: 1 },
			{ itemId: 1, timestamp: 1000, buyoutPrice: 500, count: 1 },
		]);

		const one = await items.getItem(1);
		expect(one).toMatchObject({
			quality: "Common",
			icon: "inv_misc_questionmark",
			expansion: "Unknown",
			item_class: "Unknown",
			is_craftable: true,
			is_disenchantable: true,
		});
		const ore = await items.getItem(3);
		expect(ore).toMatchObject({
			market_price: 10,
			market_volume: 3,
			second_market_price: 40,
			third_market_price: 90,
			is_reagent: true,
			is_disenchant_result: true,
		});

		expect((await items.getItem(2))?.craft_cost).toBe(30);
		expect((await items.getItem(1))?.craft_cost).toBe(60);
		expect((await items.getItem(1))?.disenchant_value).toBe(5);
		expect(await db.selectFrom("item_crafting").selectAll().execute()).toHaveLength(2);
		expect(await db.selectFrom("item_disenchanting").selectAll().execute()).toHaveLength(1);
	});

	it("craft_cost is null (never silently understated) when a reagent has no known price", async () => {
		await impItems([
			item({ id: 1, name: "A" }),
			item({ id: 2, name: "B" }),
			crafting({ itemId: 1, reagentItemId: 2, quantity: 1 }),
		]);
		expect((await items.getItem(1))?.craft_cost).toBeNull();
		expect((await items.getItem(1))?.profit_absolute).toBeNull();
	});

	it("a later import replaces the whole catalog wholesale", async () => {
		await impItems([item({ id: 1, name: "Old" })]);
		await impItems([item({ id: 2, name: "New" })]);
		expect(await items.getItem(1)).toBeUndefined();
		expect((await items.getItem(2))?.name).toBe("New");
	});

	it("groups group_volume + computes variant siblings for items sharing an exact name", async () => {
		await impItems([item({ id: 1, name: "Cloth" }), item({ id: 2, name: "Cloth" }), item({ id: 3, name: "Solo" })]);
		await seedAuctions([
			{ itemId: 1, timestamp: 1, buyoutPrice: 5, count: 4 },
			{ itemId: 2, timestamp: 1, buyoutPrice: 5, count: 6 },
		]);
		expect((await items.getItem(1))?.group_volume).toBe(10);
		const info = await items.getCraftingInfo(1);
		expect(info?.variants.map((v) => v.id)).toEqual([2]);
		expect((await items.getCraftingInfo(3))?.variants).toEqual([]);
	});

	it("listItemsQuery: search / quality multi-value / price + flip filters / sort / cursor", async () => {
		await impItems(
			Array.from({ length: 5 }, (_, i) =>
				item({ id: i + 1, name: `Herb ${i + 1}`, quality: i % 2 ? "Rare" : "Common" }),
			),
		);
		await seedAuctions([
			{ itemId: 1, timestamp: 1, buyoutPrice: 30 },
			{ itemId: 1, timestamp: 1, buyoutPrice: 90 },
			{ itemId: 2, timestamp: 1, buyoutPrice: 50 },
			{ itemId: 3, timestamp: 1, buyoutPrice: 10 },
			{ itemId: 4, timestamp: 1, buyoutPrice: 40 },
			{ itemId: 5, timestamp: 1, buyoutPrice: 20 },
		]);
		expect((await items.listItemsQuery({ search: "Herb 1" } as never)).items.map((i) => i.id)).toEqual([1]);
		expect(
			(await items.listItemsQuery({ quality: "Rare,Common", minMarketPrice: 45 } as never)).items.map((i) => i.id),
		).toEqual([2]);

		const p1 = await items.listItemsQuery({ sortBy: "marketPrice", sortDir: "asc", limit: 2 } as never);
		expect(p1.items.map((i) => i.id)).toEqual([3, 5]);
		expect(p1.nextCursor).toBeTruthy();
		const p2 = await items.listItemsQuery({
			sortBy: "marketPrice",
			sortDir: "asc",
			limit: 2,
			cursor: p1.nextCursor!,
		} as never);
		expect(p2.items.map((i) => i.id)).toEqual([1, 4]);

		expect(
			(await items.listItemsQuery({ minFlipPercent: 100, sortBy: "flipPercent", sortDir: "desc" } as never)).items.map(
				(i) => i.id,
			),
		).toEqual([1]);
	});

	it("countItems + getItemFilterOptions", async () => {
		await impItems([
			item({ id: 1, name: "A", slot: "Head", itemClass: "Armor" }),
			item({ id: 2, name: "B", slot: "Unknown", itemClass: "Weapon" }),
		]);
		await seedAuctions([{ itemId: 1, timestamp: 1, buyoutPrice: 5 }]);
		expect(await items.countItems()).toEqual({ total: 2, withPrice: 1 });
		const opts = await items.getItemFilterOptions();
		expect(opts.slots).toEqual(["Head"]);
		expect(opts.itemClasses.sort()).toEqual(["Armor", "Weapon"]);
	});

	it("getBreakdown: buy vs craft, recursion, and cycle-safety", async () => {
		expect(await getBreakdown(404)).toBeNull();
		await impItems([item({ id: 1, name: "Leaf" })]);
		await seedAuctions([{ itemId: 1, timestamp: 1, buyoutPrice: 10 }]);
		expect((await getBreakdown(1))?.tree.decision).toBe("buy");

		await impItems([
			item({ id: 1, name: "A" }),
			item({ id: 2, name: "B" }),
			item({ id: 3, name: "C" }),
			crafting({ itemId: 2, reagentItemId: 1, quantity: 3 }),
			crafting({ itemId: 3, reagentItemId: 2, quantity: 2 }),
		]);
		await seedAuctions([
			{ itemId: 1, timestamp: 1, buyoutPrice: 10 },
			{ itemId: 2, timestamp: 1, buyoutPrice: 999 },
			{ itemId: 3, timestamp: 1, buyoutPrice: 999 },
		]);
		const bd = await getBreakdown(3);
		expect(bd?.tree.decision).toBe("craft");
		expect(bd?.tree.children[0]?.decision).toBe("craft");
		expect(bd?.tree.children[0]?.children[0]?.decision).toBe("buy");
		expect(bd?.tree.totalCost).toBe(60);

		await impItems([
			item({ id: 1, name: "X" }),
			item({ id: 2, name: "Y" }),
			crafting({ itemId: 1, reagentItemId: 2, quantity: 1 }),
			crafting({ itemId: 2, reagentItemId: 1, quantity: 1 }),
		]);
		await seedAuctions([
			{ itemId: 1, timestamp: 1, buyoutPrice: 7 },
			{ itemId: 2, timestamp: 1, buyoutPrice: 7 },
		]);
		expect((await getBreakdown(1))?.tree.itemId).toBe(1);
	});
});

describe("auctions", () => {
	it("one upload = one server-stamped snapshot; a same-day re-import replaces it; non-catalog items ignored", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		await impAuctions([
			{ itemId: 1, count: 1, buyoutPrice: 100 },
			{ itemId: 999, count: 1, buyoutPrice: 1 },
		]);
		let snaps = await db.selectFrom("auction_listings").select("timestamp").distinct().execute();
		expect(snaps).toHaveLength(1);
		expect(await db.selectFrom("auction_listings").selectAll().execute()).toHaveLength(1);
		await impAuctions([{ itemId: 1, count: 1, buyoutPrice: 50 }]);
		snaps = await db.selectFrom("auction_listings").select("timestamp").distinct().execute();
		expect(snaps).toHaveLength(1);
		expect((await items.getItem(1))?.market_price).toBe(50);
	});

	it("retention collapses same-day snapshots to the newest and keeps the daily/weekly/monthly tiers", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		const now = Math.floor(Date.now() / 1000);
		await seedAuctions([
			{ itemId: 1, timestamp: now - 100, buyoutPrice: 1 },
			{ itemId: 1, timestamp: now - 200, buyoutPrice: 2 },
			{ itemId: 1, timestamp: now - 3 * 86400, buyoutPrice: 3 },
			{ itemId: 1, timestamp: now - 100 * 86400, buyoutPrice: 4 },
		]);
		await enforceListingsRetention();
		const kept = (await db.selectFrom("auction_listings").select("timestamp").distinct().execute())
			.map((r) => r.timestamp)
			.sort((a, b) => a - b);
		expect(kept).toEqual([now - 100 * 86400, now - 3 * 86400, now - 100]);
	});

	it("getPriceHistory aggregates per snapshot inside the window and excludes older; listings sorted cheapest-first", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		const now = Math.floor(Date.now() / 1000);
		await seedAuctions([
			{ itemId: 1, timestamp: now - 86400, buyoutPrice: 20, count: 2 },
			{ itemId: 1, timestamp: now - 86400, buyoutPrice: 60, count: 2 },
			{ itemId: 1, timestamp: now - 40 * 86400, buyoutPrice: 5, count: 1 },
		]);
		const h = await auctionsSvc.getPriceHistory(1, 7);
		expect(h.points).toHaveLength(1);
		expect(h.points[0]).toMatchObject({ price: 10, volume: 4 });
		expect((await auctionsSvc.getPriceHistory(2, 7)).points).toEqual([]);
		const cur = await auctionsSvc.getCurrentListings(1);
		expect(cur.listings.map((l) => l.unit_price)).toEqual([10, 30]);
	});
});

describe("characters", () => {
	it("roster upsert never drops absent characters; inventory snapshot gates on isNewest and full-syncs drops", async () => {
		await impItems([item({ id: 1, name: "Herb" }), item({ id: 2, name: "Ore" })]);
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		await impChars([{ name: "Bar", realm: "R", race: "Orc", class: "Hunter", gender: "F" }]);
		expect((await charSvc.listCharacters()).map((c) => c.name).sort()).toEqual(["Bar", "Foo"]);

		expect(
			(await inventoryRoutes.request("/import?name=Ghost&realm=R&timestamp=1&gold=0", { method: "POST" })).status,
		).toBe(404);
		await impInv("?name=Foo&realm=R&timestamp=100&gold=500", [
			{ kind: "item", itemId: 1, count: 5, location: "bag" },
			{ kind: "item", itemId: 2, count: 2, location: "bag" },
		]);
		expect((await charSvc.getCharacter(1))?.current_gold).toBe(500);
		expect(await db.selectFrom("inventory").selectAll().execute()).toHaveLength(2);

		await impInv("?name=Foo&realm=R&timestamp=200&gold=600", [{ kind: "item", itemId: 1, count: 9, location: "bag" }]);
		const inv = await db.selectFrom("inventory").selectAll().execute();
		expect(inv.map((i) => i.item_id)).toEqual([1]);
		expect(inv[0]?.count).toBe(9);

		await impInv("?name=Foo&realm=R&timestamp=150&gold=1", [{ kind: "item", itemId: 2, count: 1, location: "bag" }]);
		expect((await charSvc.getCharacter(1))?.current_gold).toBe(600);
		expect((await db.selectFrom("inventory").selectAll().execute()).map((i) => i.item_id)).toEqual([1]);
		expect(await db.selectFrom("inventory_snapshots").select("timestamp").distinct().execute()).toHaveLength(3);
	});

	it("professions are append-only history; listProfessions surfaces only the latest per profession; retention keeps one per bucket", async () => {
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		const prof = (t: number, skill: number) =>
			impInv(`?name=Foo&realm=R&timestamp=${t}&gold=0`, [
				{ kind: "profession", professionId: 1, skillLevel: skill, maxSkillLevel: 100 },
			]);
		const now = Math.floor(Date.now() / 1000);
		await prof(now - 10, 10);
		await prof(now - 10, 10);
		await prof(now - 5, 20);
		await prof(now - 400 * 86400, 1);
		const list = await charSvc.listProfessions();
		expect(list).toHaveLength(1);
		expect(list[0]?.skill_level).toBe(20);
		expect((await db.selectFrom("character_professions").selectAll().execute()).length).toBe(2);
	});

	it("gold history + inventory joins over HTTP", async () => {
		await impItems([item({ id: 1, name: "Herb" })]);
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		await impInv("?name=Foo&realm=R&timestamp=100&gold=42", [{ kind: "item", itemId: 1, count: 3, location: "bag" }]);
		expect((await (await characterRoutes.request("/1/gold-history")).json())[0]).toMatchObject({ gold: 42 });
		const invRes = await inventoryRoutes.request("/");
		expect((await invRes.json())[0]).toMatchObject({ item_name: "Herb", character_name: "Foo", count: 3 });
	});
});

describe("farming", () => {
	it("route upsert by name replaces results wholesale; gold/hour is NULL if any item is unpriced", async () => {
		await impItems([item({ id: 1, name: "Herb" }), item({ id: 2, name: "Ore" })]);
		await seedAuctions([{ itemId: 1, timestamp: 1, buyoutPrice: 10 }]);
		await impFarming([
			{ routeName: "Loop", runAt: 100, itemId: 1, perHour: 3 },
			{ routeName: "Loop", runAt: 100, itemId: 999, perHour: 1 },
		]);
		await impFarming([{ routeName: "Loop", runAt: 200, itemId: 1, perHour: 5 }]);
		await impFarming([{ routeName: "Unpriced", runAt: 1, itemId: 2, perHour: 4 }]);
		const list = await farmSvc.listFarmRoutes();
		expect(list.find((r) => r.name === "Loop")).toMatchObject({ run_at: 200, gold_per_hour: 50 });
		expect(list.find((r) => r.name === "Unpriced")?.gold_per_hour).toBeNull();
	});

	it("getCraftingOpportunities: crafts from farmed reagents, capped by the scarcest, rest priced at market", async () => {
		await impItems([
			item({ id: 10, name: "Craft" }),
			item({ id: 1, name: "FarmA" }),
			item({ id: 2, name: "FarmB" }),
			item({ id: 3, name: "BuyC" }),
			crafting({ itemId: 10, reagentItemId: 1, quantity: 2 }),
			crafting({ itemId: 10, reagentItemId: 2, quantity: 1 }),
			crafting({ itemId: 10, reagentItemId: 3, quantity: 1 }),
		]);
		await seedAuctions([
			{ itemId: 10, timestamp: 1, buyoutPrice: 1000 },
			{ itemId: 3, timestamp: 1, buyoutPrice: 20 },
		]);
		await impFarming([
			{ routeName: "Rt", runAt: 1, itemId: 1, perHour: 100 },
			{ routeName: "Rt", runAt: 1, itemId: 2, perHour: 30 },
		]);
		const route = await db.selectFrom("farm_routes").selectAll().executeTakeFirstOrThrow();
		const opps = await farmSvc.getCraftingOpportunities(route.id);
		expect(opps).toHaveLength(1);
		expect(opps[0]).toMatchObject({ itemId: 10, craftsPerHour: 30 });
		expect(opps[0]!.reagentsToBuy.map((r) => r.itemId)).toEqual([3]);
	});

	it("deleteFarmRoute removes route + results; 404 for unknown", async () => {
		await impItems([item({ id: 1, name: "Herb" })]);
		await impFarming([{ routeName: "Loop", runAt: 1, itemId: 1, perHour: 5 }]);
		const route = await db.selectFrom("farm_routes").selectAll().executeTakeFirstOrThrow();
		expect((await farmingRoutes.request(`/${route.id}`, { method: "DELETE" })).status).toBe(204);
		expect((await farmingRoutes.request(`/${route.id}`, { method: "DELETE" })).status).toBe(404);
		expect(await db.selectFrom("farm_route_results").selectAll().execute()).toEqual([]);
	});
});

describe("summary + wipes", () => {
	it("getDataSummary aggregates counts and per-timestamp batches", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		await seedAuctions([
			{ itemId: 1, timestamp: 10, buyoutPrice: 1 },
			{ itemId: 1, timestamp: 20, buyoutPrice: 2 },
		]);
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		await impFarming([{ routeName: "L", runAt: 1, itemId: 1, perHour: 5 }]);
		const s = await getDataSummary();
		expect(s).toMatchObject({ items: 1, characters: 1, farmRoutes: 1 });
		expect(s.auctionBatches).toEqual([
			{ timestamp: 20, count: 1 },
			{ timestamp: 10, count: 1 },
		]);
	});

	it("wipeItems cascades to every item-scoped table; independent entities keep their own rows", async () => {
		await impItems([
			item({ id: 1, name: "Sword" }),
			item({ id: 2, name: "Ore" }),
			crafting({ itemId: 1, reagentItemId: 2, quantity: 1 }),
		]);
		await impAuctions([{ itemId: 1, count: 1, buyoutPrice: 10 }]);
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		await impFarming([{ routeName: "L", runAt: 1, itemId: 2, perHour: 5 }]);
		await wipeItems();
		for (const t of [
			"items_catalog",
			"items",
			"item_crafting",
			"auction_listings",
			"craft_costs",
			"farm_route_results",
		] as const) {
			expect(await db.selectFrom(t).selectAll().execute()).toEqual([]);
		}
		expect(await db.selectFrom("farm_routes").selectAll().execute()).toHaveLength(1);
		expect(await db.selectFrom("characters").selectAll().execute()).toHaveLength(1);
	});

	it("wipeAuctions scoped keeps other batches + recomputes prices; full wipe returns items to a price-less state", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		await seedAuctions([
			{ itemId: 1, timestamp: 100, buyoutPrice: 10 },
			{ itemId: 1, timestamp: 200, buyoutPrice: 20 },
		]);
		await wipeAuctions(200);
		expect(await db.selectFrom("auction_listings").select("timestamp").execute()).toEqual([{ timestamp: 100 }]);
		expect((await items.getItem(1))?.market_price).toBe(10);
		await wipeAuctions();
		expect((await items.getItem(1))?.market_price).toBeNull();
		expect((await items.getItem(1))?.last_timestamp).toBeNull();
	});

	it("wipeCharacters / wipeInventorySnapshots / wipeFarmRoutes + DELETE routes", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		await impChars([{ name: "Foo", realm: "R", race: "Human", class: "Warrior", gender: "M" }]);
		await impInv("?name=Foo&realm=R&timestamp=100&gold=0", [{ kind: "item", itemId: 1, count: 1, location: "bag" }]);
		await impInv("?name=Foo&realm=R&timestamp=200&gold=0", [{ kind: "item", itemId: 1, count: 1, location: "bag" }]);
		await wipeInventorySnapshots(100);
		expect(await db.selectFrom("inventory_snapshots").select("timestamp").execute()).toEqual([{ timestamp: 200 }]);
		expect(await db.selectFrom("inventory").selectAll().execute()).toHaveLength(1);
		await wipeCharacters();
		expect(await db.selectFrom("characters").selectAll().execute()).toEqual([]);
		expect(await db.selectFrom("inventory_snapshots").selectAll().execute()).toEqual([]);

		await impFarming([{ routeName: "L", runAt: 1, itemId: 1, perHour: 5 }]);
		await wipeFarmRoutes();
		expect(await db.selectFrom("farm_routes").selectAll().execute()).toEqual([]);

		for (const r of [farmingRoutes, characterRoutes, inventoryRoutes, auctionRoutes, itemRoutes]) {
			expect((await r.request("/", { method: "DELETE" })).status).toBe(204);
		}
	});
});

describe("routes", () => {
	it("every GET route serves the shape the frontend consumes", async () => {
		await impItems([
			item({ id: 1, name: "Sword" }),
			item({ id: 2, name: "Ore" }),
			crafting({ itemId: 1, reagentItemId: 2, quantity: 1 }),
		]);
		await impAuctions([
			{ itemId: 1, count: 1, buyoutPrice: 30 },
			{ itemId: 2, count: 1, buyoutPrice: 5 },
		]);
		await impFarming([{ routeName: "L", runAt: 1, itemId: 2, perHour: 5 }]);

		expect((await (await itemRoutes.request("/")).json()).items).toHaveLength(2);
		expect((await (await itemRoutes.request("/1")).json()).name).toBe("Sword");
		expect((await (await itemRoutes.request("/1/crafting-info")).json()).crafting[0].id).toBe(2);
		expect((await (await itemRoutes.request("/1/breakdown")).json()).tree.itemId).toBe(1);
		expect((await itemRoutes.request("/999")).status).toBe(404);
		expect((await (await auctionRoutes.request("/1/history?days=90")).json()).points.length).toBeGreaterThanOrEqual(1);
		expect((await (await auctionRoutes.request("/1/listings")).json()).listings).toHaveLength(1);
		expect(await (await farmingRoutes.request("/")).json()).toHaveLength(1);
	});
});

describe("import pipeline", () => {
	it("malformed gzip body -> error line, catalog untouched", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		const res = await itemRoutes.request("/import", {
			method: "POST",
			body: new Blob([crypto.getRandomValues(new Uint8Array(4096))]),
		});
		expect(await res.text()).toContain("[error]");
		expect(await db.selectFrom("items_catalog").selectAll().execute()).toHaveLength(1);
	});

	it("empty gzip -> ok rows:0, no mutation", async () => {
		const r = await impAuctions([]);
		expect(r).toMatchObject({ ok: true, rows: 0 });
		expect(await db.selectFrom("auction_listings").selectAll().execute()).toEqual([]);
	});

	it("a malformed row is skipped, not fatal - the good rows still import", async () => {
		await impItems([item({ id: 1, name: "Ore" }), item({ id: 2, name: "Bar" })]);
		const r = await impAuctions([
			{ itemId: 1, count: 1, buyoutPrice: 100 },
			{ itemId: 2, count: 1, buyoutPrice: "oops" },
			{ count: 1, buyoutPrice: 50 },
			{ itemId: 2, count: 1, buyoutPrice: 200 },
		]);
		expect(r).toMatchObject({ ok: true, rows: 2, skipped: 2 });
		expect((await db.selectFrom("auction_listings").select("item_id").execute()).map((x) => x.item_id).sort()).toEqual([
			1, 2,
		]);
	});

	it("client abort mid-import leaves the DB consistent and the next import succeeds", async () => {
		await impItems([item({ id: 1, name: "Ore" })]);
		const body = new Blob([
			Bun.gzipSync(
				new TextEncoder().encode(
					Array.from({ length: 20000 }, (_, i) =>
						JSON.stringify({ itemId: 1, count: 1, buyoutPrice: 10 + (i % 7) }),
					).join("\n"),
				),
			),
		]);
		const ctl = new AbortController();
		const p = Promise.resolve(auctionRoutes.request("/import", { method: "POST", body, signal: ctl.signal }))
			.then((r) => r.text())
			.catch(() => {});
		setTimeout(() => ctl.abort(), 10);
		await p;
		expect(await db.selectFrom("auction_listings").selectAll().execute()).toBeDefined();
		expect((await impAuctions([{ itemId: 1, count: 1, buyoutPrice: 3 }])).ok).toBe(true);
		expect((await items.getItem(1))?.market_price).toBe(3);
	});

	it("a hard-killed writer's committed rows all survive the WAL replay on reopen", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ahp-crash-"));
		const path = join(dir, "c.sqlite").replace(/\\/g, "/");
		const code = `import{Database}from"bun:sqlite";const d=new Database(${JSON.stringify(path)},{create:true});d.exec("PRAGMA journal_mode=WAL");d.exec("PRAGMA synchronous=NORMAL");d.exec("CREATE TABLE t(i integer)");const s=d.prepare("INSERT INTO t VALUES(?)");for(let i=0;i<3000;i++)s.run(i);process.stdout.write("OK");await new Promise(()=>{});`;
		const proc = Bun.spawn(["bun", "-e", code], { stdout: "pipe" });
		const rd = (proc.stdout as ReadableStream<Uint8Array>).getReader();
		await rd.read();
		rd.releaseLock();
		proc.kill(9);
		await proc.exited;
		const re = new Database(path);
		expect((re.query("SELECT count(*) AS n FROM t").get() as { n: number }).n).toBe(3000);
		re.close();
		await rm(dir, { recursive: true, force: true });
	}, 30_000);
});
