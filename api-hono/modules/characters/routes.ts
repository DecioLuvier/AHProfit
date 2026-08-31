import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { timestampQuerySchema } from "../shared/common";
import { importJsonl } from "../shared/stream";
import {
	characterParamSchema,
	characterRowSchema,
	type InventoryRow,
	inventoryRowSchema,
	inventorySnapshotQuerySchema,
	inventorySnapshotsQuerySchema,
} from "./contracts";
import {
	characterExists,
	getCharacter,
	getGoldHistory,
	listCharacters,
	listInventory,
	listInventorySnapshots,
	listProfessions,
} from "./service.read";
import { insertCharacters, insertInventorySnapshot, wipeCharacters, wipeInventorySnapshots } from "./service.write";

export const characterRoutes = new Hono()
	.post(
		"/import",
		importJsonl(characterRowSchema, async (batches, s) => {
			let n = 0;
			for await (const rows of batches) {
				const unique = [...new Map(rows.map((r) => [`${r.name} ${r.realm}`, r])).values()];
				await insertCharacters(unique);
				await s.writeln(`[progress] ${(n += rows.length)} characters imported`);
			}
		}),
	)
	.get("/", async (c) => c.json(await listCharacters()))
	.get("/professions", async (c) => c.json(await listProfessions()))
	.delete("/", async (c) => {
		await wipeCharacters();
		return c.body(null, 204);
	})
	.get("/:id", zValidator("param", characterParamSchema), async (c) => {
		const character = await getCharacter(c.req.valid("param").id);
		return character ? c.json(character) : c.json({ error: "Character not found" }, 404);
	})
	.get("/:id/gold-history", zValidator("param", characterParamSchema), async (c) => {
		return c.json(await getGoldHistory(c.req.valid("param").id));
	});

export const inventoryRoutes = new Hono()
	.post(
		"/import",
		zValidator("query", inventorySnapshotQuerySchema),
		async (c, next) => {
			const { name, realm } = c.req.valid("query");
			if (!(await characterExists(name, realm))) return c.json({ error: `Character ${name}-${realm} not found` }, 404);
			return next();
		},
		importJsonl(inventoryRowSchema, async (batches, s, c) => {
			const { name, realm, timestamp, gold } = inventorySnapshotQuerySchema.parse(c.req.query());
			const all: InventoryRow[] = [];
			for await (const rows of batches) {
				all.push(...rows);
				await s.writeln(`[progress] ${all.length} rows buffered`);
			}
			await s.writeln("[finalize] applying snapshot...");
			insertInventorySnapshot({ name, realm, timestamp, gold, rows: all });
		}),
	)
	.get("/", async (c) => c.json(await listInventory()))
	.get("/snapshots", zValidator("query", inventorySnapshotsQuerySchema), async (c) => {
		const { from, to } = c.req.valid("query");
		return c.json(await listInventorySnapshots(from, to));
	})
	.delete("/", zValidator("query", timestampQuerySchema), async (c) => {
		await wipeInventorySnapshots(c.req.valid("query").timestamp);
		return c.body(null, 204);
	})
	.get(
		"/characters/:id/snapshots",
		zValidator("param", characterParamSchema),
		zValidator("query", inventorySnapshotsQuerySchema),
		async (c) => {
			const { id } = c.req.valid("param");
			const { from, to } = c.req.valid("query");
			return c.json(await listInventorySnapshots(from, to, id));
		},
	);
