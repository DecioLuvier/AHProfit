import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { importJsonl } from "../shared/stream";
import { type FarmingRow, farmingRowSchema, farmRouteParamSchema } from "./contracts";
import { getCraftingOpportunities, getFarmRoute, listFarmRoutes } from "./service.read";
import { deleteFarmRoute, insertFarmRoutes, wipeFarmRoutes } from "./service.write";

export const farmingRoutes = new Hono()
	.post(
		"/import",
		importJsonl(farmingRowSchema, async (batches, s) => {
			const all: FarmingRow[] = [];
			for await (const rows of batches) {
				all.push(...rows);
				await s.writeln(`[progress] ${all.length} rows buffered`);
			}
			await s.writeln("[finalize] rebuilding routes...");
			insertFarmRoutes(all);
		}),
	)
	.get("/", async (c) => c.json(await listFarmRoutes()))
	.delete("/", async (c) => {
		wipeFarmRoutes();
		return c.body(null, 204);
	})
	.get("/:id", zValidator("param", farmRouteParamSchema), async (c) => {
		const route = await getFarmRoute(c.req.valid("param").id);
		return route ? c.json(route) : c.json({ error: "Farm route not found" }, 404);
	})
	.get("/:id/crafting-opportunities", zValidator("param", farmRouteParamSchema), async (c) => {
		return c.json(await getCraftingOpportunities(c.req.valid("param").id));
	})
	.delete("/:id", zValidator("param", farmRouteParamSchema), async (c) => {
		const deleted = await deleteFarmRoute(c.req.valid("param").id);
		return deleted ? c.body(null, 204) : c.json({ error: "Farm route not found" }, 404);
	});
