import { db, sqlite } from "../../database/db";
import { refreshAuctions } from "../auctions/service.write";
import type { ItemRow } from "./contracts";

export async function resetItemCatalog(): Promise<void> {
	for (const t of ["item_crafting", "item_disenchanting", "item_variants", "craft_costs", "items_catalog"] as const) {
		await db.deleteFrom(t).execute();
	}
}

export function insertItems(rows: ItemRow[]): void {
	const catalog = rows.filter((r) => r.kind === "item");
	const crafting = rows.filter((r) => r.kind === "crafting");
	const disenchant = rows.filter((r) => r.kind === "disenchanting");
	if (!catalog.length && !crafting.length && !disenchant.length) return;

	if (catalog.length) {
		sqlite.run(
			`INSERT INTO items_catalog (id, name, slot, quality, quality_tier, icon, expansion, item_class, item_subclass, sell_price)
			 SELECT value ->> 'id', value ->> 'name', value ->> 'slot', value ->> 'quality', value ->> 'qualityTier',
			        value ->> 'icon', value ->> 'expansion', value ->> 'itemClass', value ->> 'itemSubclass', value ->> 'sellPrice'
			 FROM json_each(?) WHERE true
			 ON CONFLICT (id) DO UPDATE SET
			        name = excluded.name, slot = excluded.slot, quality = excluded.quality,
			        quality_tier = excluded.quality_tier, icon = excluded.icon, expansion = excluded.expansion,
			        item_class = excluded.item_class, item_subclass = excluded.item_subclass,
			        sell_price = excluded.sell_price`,
			[JSON.stringify(catalog)],
		);
	}
	if (crafting.length) {
		sqlite.run(
			`INSERT INTO item_crafting (item_id, reagent_id, quantity)
			 SELECT value ->> 'itemId', value ->> 'reagentItemId', value ->> 'quantity'
			 FROM json_each(?) WHERE value ->> 'itemId' <> value ->> 'reagentItemId'
			 ON CONFLICT (item_id, reagent_id) DO UPDATE SET quantity = excluded.quantity`,
			[JSON.stringify(crafting)],
		);
	}
	if (disenchant.length) {
		sqlite.run(
			`INSERT INTO item_disenchanting (item_id, disenchant_item_id, chance_percent)
			 SELECT value ->> 'itemId', value ->> 'disenchantItemId', value ->> 'chancePercent'
			 FROM json_each(?) WHERE true
			 ON CONFLICT (item_id, disenchant_item_id) DO UPDATE SET chance_percent = excluded.chance_percent`,
			[JSON.stringify(disenchant)],
		);
	}
}

export async function wipeItems(): Promise<void> {
	await db.transaction().execute(async (trx) => {
		for (const t of [
			"item_crafting",
			"item_disenchanting",
			"item_variants",
			"auction_listings",
			"farm_route_results",
			"inventory",
			"inventory_snapshots",
			"craft_costs",
			"items_catalog",
		] as const) {
			await trx.deleteFrom(t).execute();
		}
	});
	await refreshAuctions();
}
