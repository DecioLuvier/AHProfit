import { sql } from "kysely";
import type { z } from "zod";
import { db } from "../../database/db";
import { decodeCursor, encodeCursor } from "../shared/cursor";
import { listItemsQuerySchema } from "./contracts";
import { applyCursor, getFilters, getSorting } from "./service.filters";

type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export async function getItem(id: number) {
	return db.selectFrom("items").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function getItemFilterOptions(itemClasses?: string[]) {
	const hasClasses = Boolean(itemClasses && itemClasses.length > 0);

	const [slots, allItemClasses, itemSubclasses] = await Promise.all([
		db
			.selectFrom("items")
			.select("slot")
			.distinct()
			.where("slot", "not in", ["Unknown", "None"])
			.$if(hasClasses, (qb) => qb.where("item_class", "in", itemClasses!))
			.orderBy("slot")
			.execute(),
		db
			.selectFrom("items")
			.select("item_class")
			.distinct()
			.where("item_class", "!=", "Unknown")
			.orderBy("item_class")
			.execute(),
		db
			.selectFrom("items")
			.select("item_subclass")
			.distinct()
			.where("item_subclass", "!=", "Unknown")
			.$if(hasClasses, (qb) => qb.where("item_class", "in", itemClasses!))
			.orderBy("item_subclass")
			.execute(),
	]);

	return {
		slots: slots.map((s) => s.slot),
		itemClasses: allItemClasses.map((c) => c.item_class),
		itemSubclasses: itemSubclasses.map((c) => c.item_subclass),
	};
}

export async function countItems() {
	return db
		.selectFrom("items")
		.select([
			sql<number>`CAST(COUNT(*) AS INTEGER)`.as("total"),
			sql<number>`CAST(COUNT(market_price) AS INTEGER)`.as("withPrice"),
		])
		.executeTakeFirstOrThrow();
}

export async function listItemsQuery(rawQuery: ListItemsQuery) {
	const query = listItemsQuerySchema.parse(rawQuery);
	const { limit, sortBy, sortDir, cursor } = query;

	const filtered = getFilters(db.selectFrom("items").selectAll("items"), query);
	const { query: sortedQuery, sortColumn } = getSorting(filtered, sortBy, sortDir);
	const cursored = applyCursor(sortedQuery, sortColumn, sortDir, decodeCursor(cursor));
	const q = cursored.select(sortColumn.expr.as("sort_val")).limit(limit + 1);

	const rows = await q.execute();
	const hasMore = rows.length > limit;
	const page = rows.slice(0, limit);
	const last = page.at(-1);

	let nextCursor = null;
	if (hasMore && last) nextCursor = encodeCursor({ id: last.id, val: last.sort_val ?? null });

	return { items: page.map(({ sort_val, ...item }) => item), nextCursor };
}

export async function getCraftingInfo(id: number) {
	const item = await getItem(id);
	if (!item) return null;

	const [crafting, usedAsReagentIn, disenchanting, disenchantOf, variant] = await Promise.all([
		db
			.selectFrom("item_crafting")
			.innerJoin("items", "items.id", "item_crafting.reagent_id")
			.select(["items.id", "items.name", "items.icon", "items.quality", "items.quality_tier", "item_crafting.quantity"])
			.where("item_crafting.item_id", "=", id)
			.execute(),
		db
			.selectFrom("item_crafting")
			.innerJoin("items", "items.id", "item_crafting.item_id")
			.select(["items.id", "items.name", "items.icon", "items.quality", "items.quality_tier", "item_crafting.quantity"])
			.where("item_crafting.reagent_id", "=", id)
			.execute(),
		db
			.selectFrom("item_disenchanting")
			.innerJoin("items", "items.id", "item_disenchanting.disenchant_item_id")
			.select([
				"items.id",
				"items.name",
				"items.icon",
				"items.quality",
				"items.quality_tier",
				"item_disenchanting.chance_percent as chancePercent",
			])
			.where("item_disenchanting.item_id", "=", id)
			.execute(),
		db
			.selectFrom("item_disenchanting")
			.innerJoin("items", "items.id", "item_disenchanting.item_id")
			.select([
				"items.id",
				"items.name",
				"items.icon",
				"items.quality",
				"items.quality_tier",
				"item_disenchanting.chance_percent as chancePercent",
			])
			.where("item_disenchanting.disenchant_item_id", "=", id)
			.execute(),
		db.selectFrom("item_variants").select("group_id").where("item_id", "=", id).executeTakeFirst(),
	]);

	const variants = variant
		? await db
				.selectFrom("item_variants")
				.innerJoin("items", "items.id", "item_variants.item_id")
				.select([
					"items.id",
					"items.name",
					"items.icon",
					"items.quality",
					"items.quality_tier",
					"items.market_price as marketPrice",
				])
				.where("item_variants.group_id", "=", variant.group_id)
				.where("item_variants.item_id", "!=", id)
				.execute()
		: [];

	return { item, variants, crafting, usedAsReagentIn, disenchanting, disenchantOf };
}

export async function getDataSummary() {
	const [itemsCount, charactersCount, farmRoutesCount, auctionBatches, inventoryBatches] = await Promise.all([
		db.selectFrom("items_catalog").select(sql<number>`count(*)`.as("total")).executeTakeFirstOrThrow(),
		db.selectFrom("characters").select(sql<number>`count(*)`.as("total")).executeTakeFirstOrThrow(),
		db.selectFrom("farm_routes").select(sql<number>`count(*)`.as("total")).executeTakeFirstOrThrow(),
		db.selectFrom("auction_batches").select(["timestamp", "count"]).orderBy("timestamp", "desc").execute(),
		db
			.selectFrom("inventory_snapshots")
			.select(["timestamp", sql<number>`count(*)`.as("count")])
			.groupBy("timestamp")
			.orderBy("timestamp", "desc")
			.execute(),
	]);

	return {
		items: itemsCount.total,
		characters: charactersCount.total,
		farmRoutes: farmRoutesCount.total,
		auctionBatches,
		inventoryBatches,
	};
}
