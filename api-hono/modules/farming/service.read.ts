import { sql } from "kysely";
import { db } from "../../database/db";
import { AH_SELLER_CUT_RATE } from "../shared/constants";

export async function listFarmRoutes() {
	return db
		.selectFrom("farm_routes")
		.leftJoin("farm_route_results", "farm_route_results.farm_route_id", "farm_routes.id")
		.leftJoin("items", "items.id", "farm_route_results.item_id")
		.select([
			"farm_routes.id",
			"farm_routes.name",
			"farm_routes.run_at",
			sql<number | null>`
				CASE
					WHEN sum(CASE WHEN farm_route_results.item_id IS NOT NULL AND items.market_price IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
					ELSE sum(farm_route_results.per_hour * items.market_price)
				END
			`.as("gold_per_hour"),
		])
		.groupBy(["farm_routes.id", "farm_routes.name", "farm_routes.run_at"])
		.orderBy("gold_per_hour", "desc")
		.execute();
}

export async function getFarmRoute(id: number) {
	const route = await db.selectFrom("farm_routes").selectAll().where("id", "=", id).executeTakeFirst();
	if (!route) return null;

	const results = await db
		.selectFrom("farm_route_results")
		.innerJoin("items", "items.id", "farm_route_results.item_id")
		.select([
			"items.id",
			"items.name",
			"items.icon",
			"items.quality",
			"items.quality_tier",
			"items.market_price",
			"farm_route_results.per_hour",
		])
		.where("farm_route_results.farm_route_id", "=", id)
		.execute();

	return {
		route,
		results: results.map((r) => ({
			itemId: r.id,
			name: r.name,
			icon: r.icon,
			quality: r.quality,
			quality_tier: r.quality_tier,
			marketPrice: r.market_price,
			perHour: r.per_hour,
			goldPerHour: r.market_price != null ? r.market_price * r.per_hour : null,
		})),
	};
}

interface ReagentRef {
	itemId: number;
	name: string;
	icon: string;
	quality?: string | null;
	quality_tier?: number | null;
	quantity: number;
}

interface CraftingOpportunity {
	itemId: number;
	name: string;
	icon: string;
	quality?: string | null;
	quality_tier?: number | null;
	craftsPerHour: number;
	profitPerCraft: number;
	goldPerHour: number;
	farmedReagents: (ReagentRef & { perHour: number })[];
	reagentsToBuy: (ReagentRef & { unitPrice: number })[];
}

export async function getCraftingOpportunities(routeId: number): Promise<CraftingOpportunity[]> {
	const farmedReagents = await db
		.selectFrom("farm_route_results")
		.select(["item_id", "per_hour"])
		.where("farm_route_id", "=", routeId)
		.execute();
	if (farmedReagents.length === 0) return [];

	const farmedPerHourById = new Map(farmedReagents.map((r) => [r.item_id, r.per_hour]));
	const farmedIds = [...farmedPerHourById.keys()];

	const candidateItemIds = await db
		.selectFrom("item_crafting")
		.select("item_id")
		.distinct()
		.where("reagent_id", "in", farmedIds)
		.execute();
	if (candidateItemIds.length === 0) return [];
	const candidateIds = candidateItemIds.map((c) => c.item_id);

	const [recipes, craftItems] = await Promise.all([
		db
			.selectFrom("item_crafting")
			.innerJoin("items as reagent", "reagent.id", "item_crafting.reagent_id")
			.select([
				"item_crafting.item_id",
				"item_crafting.reagent_id",
				"item_crafting.quantity",
				"reagent.name as reagent_name",
				"reagent.icon as reagent_icon",
				"reagent.quality as reagent_quality",
				"reagent.quality_tier as reagent_quality_tier",
				"reagent.market_price as reagent_market_price",
			])
			.where("item_crafting.item_id", "in", candidateIds)
			.execute(),
		db
			.selectFrom("items")
			.select(["id", "name", "icon", "quality", "quality_tier", "market_price"])
			.where("id", "in", candidateIds)
			.execute(),
	]);
	const craftItemById = new Map(craftItems.map((i) => [i.id, i]));

	const recipesByItemId = new Map<number, typeof recipes>();
	for (const r of recipes) {
		const list = recipesByItemId.get(r.item_id) ?? [];
		list.push(r);
		recipesByItemId.set(r.item_id, list);
	}

	const opportunities: CraftingOpportunity[] = [];
	for (const [itemId, reagents] of recipesByItemId) {
		const craftItem = craftItemById.get(itemId);
		if (!craftItem || craftItem.market_price == null) continue;

		const farmed: (ReagentRef & { perHour: number })[] = [];
		const toBuy: (ReagentRef & { unitPrice: number })[] = [];
		let craftsPerHour = Number.POSITIVE_INFINITY;
		let buyCost = 0;
		let unavailable = false;

		for (const r of reagents) {
			const perHour = farmedPerHourById.get(r.reagent_id);
			if (perHour != null) {
				farmed.push({
					itemId: r.reagent_id,
					name: r.reagent_name,
					icon: r.reagent_icon,
					quality: r.reagent_quality,
					quality_tier: r.reagent_quality_tier,
					quantity: r.quantity,
					perHour,
				});
				craftsPerHour = Math.min(craftsPerHour, perHour / r.quantity);
			} else if (r.reagent_market_price != null) {
				toBuy.push({
					itemId: r.reagent_id,
					name: r.reagent_name,
					icon: r.reagent_icon,
					quality: r.reagent_quality,
					quality_tier: r.reagent_quality_tier,
					quantity: r.quantity,
					unitPrice: r.reagent_market_price,
				});
				buyCost += r.reagent_market_price * r.quantity;
			} else {
				unavailable = true;
			}
		}
		if (unavailable || !Number.isFinite(craftsPerHour)) continue;

		const profitPerCraft = craftItem.market_price * AH_SELLER_CUT_RATE - buyCost;
		opportunities.push({
			itemId: craftItem.id,
			name: craftItem.name,
			icon: craftItem.icon,
			quality: craftItem.quality,
			quality_tier: craftItem.quality_tier,
			craftsPerHour,
			profitPerCraft,
			goldPerHour: craftsPerHour * profitPerCraft,
			farmedReagents: farmed,
			reagentsToBuy: toBuy,
		});
	}

	return opportunities.sort((a, b) => b.goldPerHour - a.goldPerHour);
}
