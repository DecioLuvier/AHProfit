import { db } from "../../database/db";

export const listCharacters = () => db.selectFrom("characters").selectAll().execute();

export const getCharacter = (id: number) =>
	db.selectFrom("characters").selectAll().where("id", "=", id).executeTakeFirst();

export const getGoldHistory = (characterId: number) =>
	db
		.selectFrom("character_snapshots")
		.selectAll()
		.where("character_id", "=", characterId)
		.orderBy("timestamp", "asc")
		.execute();

export const listProfessions = () =>
	db
		.selectFrom("character_professions")
		.innerJoin("characters", "characters.id", "character_professions.character_id")
		.selectAll("character_professions")
		.select(["characters.name as character_name", "characters.realm as character_realm"])
		.where(({ eb, selectFrom }) =>
			eb(
				"character_professions.timestamp",
				"=",
				selectFrom("character_professions as latest")
					.select(({ fn }) => fn.max("latest.timestamp").as("max_ts"))
					.whereRef("latest.character_id", "=", "character_professions.character_id")
					.whereRef("latest.profession_id", "=", "character_professions.profession_id"),
			),
		)
		.execute();

export const listInventory = () =>
	db
		.selectFrom("inventory")
		.innerJoin("items", "items.id", "inventory.item_id")
		.innerJoin("characters", "characters.id", "inventory.character_id")
		.selectAll("inventory")
		.select([
			"items.name as item_name",
			"items.icon as item_icon",
			"items.quality as item_quality",
			"items.quality_tier as item_quality_tier",
			"characters.name as character_name",
			"characters.realm as character_realm",
		])
		.execute();

export function listInventorySnapshots(from: number, to: number, characterId?: number) {
	let q = db
		.selectFrom("inventory_snapshots")
		.innerJoin("items", "items.id", "inventory_snapshots.item_id")
		.innerJoin("character_snapshots", "character_snapshots.id", "inventory_snapshots.character_snapshot_id")
		.selectAll("inventory_snapshots")
		.select([
			"items.name as item_name",
			"items.icon as item_icon",
			"items.quality as item_quality",
			"items.quality_tier as item_quality_tier",
		])
		.where("inventory_snapshots.timestamp", ">=", from)
		.where("inventory_snapshots.timestamp", "<=", to);

	if (characterId != null) q = q.where("character_snapshots.character_id", "=", characterId);

	return q.execute();
}

export async function characterExists(name: string, realm: string): Promise<boolean> {
	const row = await db
		.selectFrom("characters")
		.select("id")
		.where("name", "=", name)
		.where("realm", "=", realm)
		.executeTakeFirst();
	return Boolean(row);
}
