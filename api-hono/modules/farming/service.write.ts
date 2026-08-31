import { db, sqlite } from "../../database/db";
import type { FarmingRow } from "./contracts";

export function insertFarmRoutes(rows: FarmingRow[]) {
	if (!rows.length) return;
	const json = JSON.stringify(rows);

	sqlite.run(
		`INSERT INTO farm_routes (name, run_at)
		 SELECT value ->> 'routeName', max(value ->> 'runAt')
		 FROM json_each(?)
		 WHERE value ->> 'itemId' IN (SELECT id FROM items_catalog)
		 GROUP BY value ->> 'routeName'
		 ON CONFLICT (name) DO UPDATE SET run_at = max(run_at, excluded.run_at)`,
		[json],
	);

	sqlite.run(
		`DELETE FROM farm_route_results WHERE farm_route_id IN (
			SELECT id FROM farm_routes WHERE name IN (
				SELECT value ->> 'routeName' FROM json_each(?)
				WHERE value ->> 'itemId' IN (SELECT id FROM items_catalog)
			)
		)`,
		[json],
	);

	sqlite.run(
		`INSERT INTO farm_route_results (farm_route_id, item_id, per_hour)
		 SELECT r.id, j.value ->> 'itemId', max(j.value ->> 'perHour')
		 FROM json_each(?) j
		 JOIN farm_routes r ON r.name = j.value ->> 'routeName'
		 WHERE j.value ->> 'itemId' IN (SELECT id FROM items_catalog)
		 GROUP BY r.id, j.value ->> 'itemId'`,
		[json],
	);
}

export function wipeFarmRoutes() {
	sqlite.run(`DELETE FROM farm_route_results; DELETE FROM farm_routes;`);
}

export async function deleteFarmRoute(id: number) {
	return db.transaction().execute(async (tx) => {
		await tx.deleteFrom("farm_route_results").where("farm_route_id", "=", id).execute();
		const result = await tx.deleteFrom("farm_routes").where("id", "=", id).executeTakeFirst();
		return result.numDeletedRows > 0n;
	});
}
