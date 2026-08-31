import { type SelectQueryBuilder, sql } from "kysely";
import type { z } from "zod";
import type { DB } from "../../database/db.d";
import { AH_SELLER_CUT_RATE } from "../shared/constants";
import type { CursorPayload } from "../shared/cursor";
import type { listItemsQuerySchema } from "./contracts";

type Query = SelectQueryBuilder<DB, "items", any>;
type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

const FLIP_PERCENT = sql`(CASE WHEN items.market_price > 0 AND items.second_market_price IS NOT NULL THEN (items.second_market_price - items.market_price) / items.market_price * 100 END)`;
const LISTED_BY_NAME = sql`(SELECT COALESCE(SUM(by_name.market_volume), 0) FROM items AS by_name WHERE by_name.name = items.name)`;
const NET_PROFIT = sql`(items.market_price * ${AH_SELLER_CUT_RATE} - items.craft_cost)`;
const MARGIN_PERCENT = sql`(${NET_PROFIT} / items.craft_cost) * 100`;
const QUALITY_RANK = sql`CASE items.quality WHEN 'Poor' THEN 0 WHEN 'Common' THEN 1 WHEN 'Uncommon' THEN 2 WHEN 'Rare' THEN 3 WHEN 'Epic' THEN 4 WHEN 'Legendary' THEN 5 WHEN 'Artifact' THEN 6 WHEN 'Heirloom' THEN 7 ELSE -1 END`;

export function getFilters(q: Query, query: ListItemsQuery): Query {
	return q
		.$if(Boolean(query.search), (b) => b.where("name", "like", `%${query.search}%`))
		.$if(Boolean(query.quality), (b) => b.where("quality", "in", query.quality!.split(",")))
		.$if(Boolean(query.slot), (b) => b.where("slot", "in", query.slot!.split(",")))
		.$if(Boolean(query.itemClass), (b) => b.where("item_class", "in", query.itemClass!.split(",")))
		.$if(Boolean(query.itemSubclass), (b) => b.where("item_subclass", "in", query.itemSubclass!.split(",")))
		.$if(Boolean(query.expansion), (b) => b.where("expansion", "in", query.expansion!.split(",")))
		.$if(Boolean(query.qualityTier), (b) => b.where("quality_tier", "in", query.qualityTier!.split(",").map(Number)))
		.$if(query.minQualityTier != null, (b) => b.where("quality_tier", ">=", query.minQualityTier!))
		.$if(query.maxQualityTier != null, (b) => b.where("quality_tier", "<=", query.maxQualityTier!))
		.$if(query.minMarketPrice != null, (b) => b.where("market_price", ">=", query.minMarketPrice!))
		.$if(query.maxMarketPrice != null, (b) => b.where("market_price", "<=", query.maxMarketPrice!))
		.$if(query.minCraftCost != null, (b) => b.where("craft_cost", ">=", query.minCraftCost!))
		.$if(query.maxCraftCost != null, (b) => b.where("craft_cost", "<=", query.maxCraftCost!))
		.$if(query.minFlipPercent != null, (b) => b.where(sql<boolean>`(${FLIP_PERCENT}) >= ${query.minFlipPercent}`))
		.$if(query.maxFlipPercent != null, (b) => b.where(sql<boolean>`(${FLIP_PERCENT}) <= ${query.maxFlipPercent}`))
		.$if(query.minListedByName != null, (b) => b.where(sql<boolean>`(${LISTED_BY_NAME}) >= ${query.minListedByName}`))
		.$if(query.maxListedByName != null, (b) => b.where(sql<boolean>`(${LISTED_BY_NAME}) <= ${query.maxListedByName}`))
		.$if(query.isCraftable != null, (b) => b.where("is_craftable", "=", query.isCraftable!))
		.$if(Boolean(query.hasAuctionHousePrice), (b) => b.where("market_price", "is not", null))
		.$if(Boolean(query.onlyProfitableCraft), (b) =>
			b
				.where("market_price", "is not", null)
				.where("craft_cost", "is not", null)
				.where(sql<boolean>`(${NET_PROFIT}) > 0`),
		)
		.$if(Boolean(query.onlyAboveVendorPrice), (b) =>
			b
				.where("market_price", "is not", null)
				.where("sell_price", "is not", null)
				.where(sql<boolean>`items.market_price > items.sell_price`),
		)
		.$if(query.minMarginPercent != null, (b) =>
			b
				.where("craft_cost", ">", 0)
				.where("market_price", "is not", null)
				.where(sql<boolean>`(${MARGIN_PERCENT}) >= ${query.minMarginPercent}`),
		)
		.$if(query.maxMarginPercent != null, (b) =>
			b
				.where("craft_cost", ">", 0)
				.where("market_price", "is not", null)
				.where(sql<boolean>`(${MARGIN_PERCENT}) <= ${query.maxMarginPercent}`),
		)
		.$if(query.reagentForItemId != null, (b) =>
			b.where(({ exists, selectFrom }) =>
				exists(
					selectFrom("item_crafting")
						.select("item_id")
						.whereRef("item_crafting.reagent_id", "=", "items.id")
						.where("item_crafting.item_id", "=", query.reagentForItemId!),
				),
			),
		)
		.$if(query.disenchantResultForItemId != null, (b) =>
			b.where(({ exists, selectFrom }) =>
				exists(
					selectFrom("item_disenchanting")
						.select("item_id")
						.whereRef("item_disenchanting.disenchant_item_id", "=", "items.id")
						.where("item_disenchanting.item_id", "=", query.disenchantResultForItemId!),
				),
			),
		);
}

export function getSorting(q: Query, sortBy: ListItemsQuery["sortBy"], sortDir: "asc" | "desc" = "asc") {
	let expr = sql`items.name`;

	switch (sortBy) {
		case "marketPrice":
			expr = sql`items.market_price`;
			break;
		case "craftCost":
			expr = sql`items.craft_cost`;
			break;
		case "disenchantValue":
			expr = sql`items.disenchant_value`;
			break;
		case "groupVolume":
			expr = sql`items.group_volume`;
			break;
		case "flipPercent":
			expr = FLIP_PERCENT;
			break;
		case "profitMarginPercent":
			expr = sql`items.profit_margin_percent`;
			break;
		case "quality":
			expr = QUALITY_RANK;
			break;
		case "qualityTier":
			expr = sql`items.quality_tier`;
			break;
	}

	const query = q.orderBy(sql`${expr} ${sql.raw(sortDir)} NULLS LAST`).orderBy("id", "asc");

	return { query, sortColumn: { expr } };
}

export function applyCursor(
	q: Query,
	sortColumn: { expr: ReturnType<typeof sql> },
	sortDir: "asc" | "desc",
	cursor: CursorPayload | null,
): Query {
	if (!cursor) return q;

	const { expr } = sortColumn;
	const { val, id } = cursor;

	if (val == null) return q.where(sql<boolean>`${expr} IS NULL AND items.id > ${id}`);

	const op = sortDir === "asc" ? sql`>` : sql`<`;

	return q.where(sql<boolean>`(${expr}, items.id) ${op} (${val}, ${id}) OR ${expr} IS NULL`);
}
