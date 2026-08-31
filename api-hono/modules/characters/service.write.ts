import { HTTPException } from "hono/http-exception";
import { db, sqlite } from "../../database/db";
import type { CharacterRow, InventoryRow } from "./contracts";
import { retentionDeleteSql } from "./retention";

export async function insertCharacters(rows: CharacterRow[]): Promise<void> {
	if (!rows.length) return;
	await db
		.insertInto("characters")
		.values(rows)
		.onConflict((oc) =>
			oc.columns(["name", "realm"]).doUpdateSet((eb) => ({
				race: eb.ref("excluded.race"),
				class: eb.ref("excluded.class"),
				gender: eb.ref("excluded.gender"),
			})),
		)
		.execute();
}

export function insertInventorySnapshot(input: {
	name: string;
	realm: string;
	timestamp: number;
	gold: number;
	rows: InventoryRow[];
}) {
	const items = input.rows.filter((r) => r.kind === "item");
	const professions = input.rows.filter((r) => r.kind === "profession");
	const itemsJson = JSON.stringify(items);
	const professionsJson = JSON.stringify(professions);

	const char = sqlite
		.query<{ id: number }, [string, string]>("SELECT id FROM characters WHERE name = ? AND realm = ?")
		.get(input.name, input.realm);
	if (!char) throw new HTTPException(404, { message: `Character ${input.name}-${input.realm} not found` });
	const cid = char.id;

	const isNewest =
		sqlite.run(
			"UPDATE characters SET current_gold = ?, last_synced_at = ? WHERE id = ? AND (last_synced_at IS NULL OR last_synced_at < ?)",
			[input.gold, input.timestamp, cid, input.timestamp],
		).changes > 0;

	const snapshotId = sqlite
		.query<{ id: number }, [number, number, number]>(
			"INSERT INTO character_snapshots (character_id, timestamp, gold) VALUES (?, ?, ?) RETURNING id",
		)
		.get(cid, input.timestamp, input.gold)!.id;

	sqlite.run(
		`INSERT INTO inventory_snapshots (timestamp, item_id, count, character_snapshot_id, location)
		 SELECT ?, value ->> 'itemId', value ->> 'count', ?, value ->> 'location'
		 FROM json_each(?) WHERE value ->> 'itemId' IN (SELECT id FROM items_catalog)`,
		[input.timestamp, snapshotId, itemsJson],
	);

	sqlite.run(
		`INSERT INTO character_professions (character_id, profession_id, skill_level, max_skill_level, timestamp)
		 SELECT ?, value ->> 'professionId', value ->> 'skillLevel', value ->> 'maxSkillLevel', ?
		 FROM json_each(?) WHERE true ON CONFLICT (character_id, profession_id, timestamp) DO NOTHING`,
		[cid, input.timestamp, professionsJson],
	);

	if (isNewest) {
		sqlite.run("DELETE FROM inventory WHERE character_id = ?", [cid]);
		sqlite.run(
			`INSERT INTO inventory (character_id, item_id, count, location, updated_at)
			 SELECT ?, value ->> 'itemId', value ->> 'count', value ->> 'location', ?
			 FROM json_each(?) WHERE value ->> 'itemId' IN (SELECT id FROM items_catalog)`,
			[cid, input.timestamp, itemsJson],
		);
	}

	sqlite.run(retentionDeleteSql("character_snapshots", "character_id"));
	sqlite.run(retentionDeleteSql("character_professions", "character_id || ':' || profession_id"));
}

export async function wipeCharacters() {
	await db.transaction().execute(async (trx) => {
		await trx.deleteFrom("inventory").execute();
		await trx.deleteFrom("inventory_snapshots").execute();
		await trx.deleteFrom("character_professions").execute();
		await trx.deleteFrom("character_snapshots").execute();
		await trx.deleteFrom("characters").execute();
	});
}

export async function wipeInventorySnapshots(timestamp?: number) {
	let q = db.deleteFrom("inventory_snapshots");
	if (timestamp !== undefined) q = q.where("timestamp", "=", timestamp);
	await q.execute();
}
