import { sql } from "kysely";
import { db, sqlite } from "../../database/db";
import { AH_SELLER_CUT_RATE } from "../shared/constants";

export async function recomputeMarket() {
	const ownTransaction = !sqlite.inTransaction;
	if (ownTransaction) sqlite.run("BEGIN");
	try {
		pruneItemGraph();
		await buildCurrentSnapshot();
		await Bun.sleep(0);
		await rebuildCraftCosts();
		await Bun.sleep(0);
		await rebuildItemsTable();
		await Bun.sleep(0);
		await rebuildItemVariants();
		await sql`DROP TABLE IF EXISTS _cur`.execute(db);
		if (ownTransaction) sqlite.run("COMMIT");
	} catch (err) {
		if (ownTransaction && sqlite.inTransaction) sqlite.run("ROLLBACK");
		throw err;
	}
}

function pruneItemGraph() {
	sqlite.run(
		`DELETE FROM item_crafting WHERE item_id NOT IN (SELECT id FROM items_catalog) OR reagent_id NOT IN (SELECT id FROM items_catalog)`,
	);
	sqlite.run(
		`DELETE FROM item_disenchanting WHERE item_id NOT IN (SELECT id FROM items_catalog) OR disenchant_item_id NOT IN (SELECT id FROM items_catalog)`,
	);
}

async function buildCurrentSnapshot() {
	await sql`DROP TABLE IF EXISTS _cur`.execute(db);
	await sql`
		CREATE TEMP TABLE _cur AS
		SELECT al.item_id,
		       al.timestamp AS last_timestamp,
		       min(al.buyout_price * 1.0 / nullif(al.count, 0)) AS market_price,
		       sum(al.count) AS market_volume
		FROM auction_listings al
		JOIN (SELECT item_id, max(timestamp) AS mt FROM auction_listings GROUP BY item_id) m
		  ON m.item_id = al.item_id AND m.mt = al.timestamp
		GROUP BY al.item_id
	`.execute(db);
	await sql`CREATE UNIQUE INDEX _cur_pk ON _cur (item_id)`.execute(db);
}

async function rebuildItemsTable() {
	await db.deleteFrom("items").execute();

	await sql`
		WITH
		-- 2nd / 3rd cheapest unit price in the current snapshot (rank 1 is market_price).
		_flip AS (
			SELECT item_id,
			       max(CASE WHEN lrn = 2 THEN unit_price END) AS second_market_price,
			       max(CASE WHEN lrn = 3 THEN unit_price END) AS third_market_price
			FROM (
				SELECT al.item_id,
				       al.buyout_price * 1.0 / nullif(al.count, 0) AS unit_price,
				       row_number() OVER (
				         PARTITION BY al.item_id
				         ORDER BY al.buyout_price * 1.0 / nullif(al.count, 0)
				       ) AS lrn
				FROM auction_listings al
				JOIN _cur c ON c.item_id = al.item_id AND c.last_timestamp = al.timestamp
			)
			WHERE lrn <= 3 GROUP BY item_id
		),
		-- Per item name: combined volume across every item sharing that name, and how many share it.
		_grp AS (
			SELECT ic.name,
			       sum(coalesce(c.market_volume, 0)) AS total_volume,
			       count(*) AS member_count
			FROM items_catalog ic
			LEFT JOIN _cur c ON c.item_id = ic.id
			GROUP BY ic.name
		),
		-- Expected disenchant value = sum(chance% * the target's market price).
		_dis AS (
			SELECT d.item_id,
			       sum(d.chance_percent / 100.0 * c.market_price) AS value
			FROM item_disenchanting d
			JOIN _cur c ON c.item_id = d.disenchant_item_id
			GROUP BY d.item_id
		)
		INSERT INTO items (
			id, name, quality, quality_tier, icon, expansion, slot, item_class, item_subclass,
			sell_price, last_timestamp, market_price, market_volume, second_market_price,
			third_market_price, group_volume, craft_cost, disenchant_value, profit_absolute,
			profit_margin_percent, is_craftable, is_reagent, is_disenchantable, is_disenchant_result
		)
		SELECT
			ic.id, ic.name, ic.quality, ic.quality_tier, ic.icon, ic.expansion, ic.slot,
			ic.item_class, ic.item_subclass, ic.sell_price,
			c.last_timestamp,
			c.market_price,
			coalesce(c.market_volume, 0),
			f.second_market_price,
			f.third_market_price,
			CASE WHEN g.member_count > 1 THEN g.total_volume ELSE coalesce(c.market_volume, 0) END,
			cc.craft_cost,
			d.value,
			CASE WHEN c.market_price IS NOT NULL AND cc.craft_cost IS NOT NULL
			     THEN c.market_price * ${AH_SELLER_CUT_RATE} - cc.craft_cost END,
			CASE WHEN cc.craft_cost > 0 AND c.market_price IS NOT NULL
			     THEN ((c.market_price * ${AH_SELLER_CUT_RATE} - cc.craft_cost) / cc.craft_cost) * 100 END,
			(EXISTS (SELECT 1 FROM item_crafting x WHERE x.item_id = ic.id)),
			(EXISTS (SELECT 1 FROM item_crafting x WHERE x.reagent_id = ic.id)),
			(EXISTS (SELECT 1 FROM item_disenchanting x WHERE x.item_id = ic.id)),
			(EXISTS (SELECT 1 FROM item_disenchanting x WHERE x.disenchant_item_id = ic.id))
		FROM items_catalog ic
		LEFT JOIN _cur c        ON c.item_id  = ic.id
		LEFT JOIN _flip f       ON f.item_id  = ic.id
		LEFT JOIN _grp g        ON g.name     = ic.name
		LEFT JOIN _dis d        ON d.item_id  = ic.id
		LEFT JOIN craft_costs cc ON cc.item_id = ic.id
	`.execute(db);
}

type RecipeMap = Map<number, { reagentId: number; quantity: number }[]>;
type PriceMap = Map<number, number | null>;

const MAX_CRAFT_DEPTH = 64;

function makeCraftCostResolver(marketPrice: PriceMap, recipesByItem: RecipeMap) {
	const craftCost: PriceMap = new Map();

	function resolve(itemId: number, visiting: Set<number>, depth = 0): number | null {
		if (craftCost.has(itemId)) return craftCost.get(itemId)!;
		if (depth >= MAX_CRAFT_DEPTH) return null;

		visiting.add(itemId);
		let total = 0;
		let known = true;

		for (const r of recipesByItem.get(itemId) ?? []) {
			if (recipesByItem.has(r.reagentId) && !visiting.has(r.reagentId)) {
				resolve(r.reagentId, visiting, depth + 1);
			}

			let cost: number | null;
			if (visiting.has(r.reagentId)) {
				cost = marketPrice.get(r.reagentId) ?? null;
			} else {
				const price = marketPrice.get(r.reagentId) ?? null;
				const craft = craftCost.get(r.reagentId) ?? null;
				cost = price != null && craft != null ? Math.min(price, craft) : (craft ?? price);
			}

			if (cost == null) {
				known = false;
				break;
			}
			total += cost * r.quantity;
		}

		visiting.delete(itemId);
		const result = known ? total : null;
		craftCost.set(itemId, result);
		return result;
	}

	return { resolve, craftCost };
}

async function rebuildCraftCosts() {
	const [priceRows, recipeRows] = await Promise.all([
		sql<{ item_id: number; market_price: number | null }>`SELECT item_id, market_price FROM _cur`.execute(db),
		db.selectFrom("item_crafting").select(["item_id", "reagent_id", "quantity"]).execute(),
	]);

	const marketPrice: PriceMap = new Map(priceRows.rows.map((r) => [r.item_id, r.market_price]));
	const recipesByItem: RecipeMap = new Map();
	for (const row of recipeRows) {
		const list = recipesByItem.get(row.item_id) ?? [];
		list.push({ reagentId: row.reagent_id, quantity: row.quantity });
		recipesByItem.set(row.item_id, list);
	}

	const { resolve, craftCost } = makeCraftCostResolver(marketPrice, recipesByItem);
	for (const itemId of recipesByItem.keys()) {
		resolve(itemId, new Set());
	}

	const craftCostRows: { item_id: number; craft_cost: number }[] = [];
	for (const [id, cost] of craftCost) {
		if (cost != null) craftCostRows.push({ item_id: id, craft_cost: cost });
	}

	await db.deleteFrom("craft_costs").execute();
	const CHUNK = 800;
	for (let i = 0; i < craftCostRows.length; i += CHUNK) {
		await db
			.insertInto("craft_costs")
			.values(craftCostRows.slice(i, i + CHUNK))
			.execute();
	}
}

async function rebuildItemVariants() {
	await db.deleteFrom("item_variants").execute();

	await sql`
		INSERT INTO item_variants (item_id, group_id)
		SELECT id, dense_rank() OVER (ORDER BY name)
		FROM items_catalog
		WHERE name IN (SELECT name FROM items_catalog GROUP BY name HAVING count(*) > 1)
	`.execute(db);
}
