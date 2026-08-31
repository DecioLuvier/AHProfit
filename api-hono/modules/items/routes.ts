import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { importJsonl } from "../shared/stream";
import { itemFacetsQuerySchema, itemParamSchema, itemRowSchema, listItemsQuerySchema } from "./contracts";
import { getBreakdown } from "./service.breakdown";
import { recomputeMarket } from "./service.market";
import {
	countItems,
	getCraftingInfo,
	getDataSummary,
	getItem,
	getItemFilterOptions,
	listItemsQuery,
} from "./service.read";
import { insertItems, resetItemCatalog, wipeItems } from "./service.write";

export const itemRoutes = new Hono()
	.post(
		"/import",
		importJsonl(itemRowSchema, async (batches, s) => {
			let n = 0;
			let replaced = false;
			for await (const rows of batches) {
				if (!replaced) {
					await resetItemCatalog();
					replaced = true;
				}
				insertItems(rows);
				await s.writeln(`[progress] ${(n += rows.length)} rows imported`);
			}
			if (n > 0) {
				await s.writeln("[finalize] rebuilding market...");
				await recomputeMarket();
			}
		}),
	)
	.get("/summary", async (c) => c.json(await getDataSummary()))
	.get("/", zValidator("query", listItemsQuerySchema), async (c) => c.json(await listItemsQuery(c.req.valid("query"))))
	.get("/count", async (c) => c.json(await countItems()))
	.get("/filterOptions", zValidator("query", itemFacetsQuerySchema), async (c) => {
		const { itemClass } = c.req.valid("query");
		return c.json(await getItemFilterOptions(itemClass ? itemClass.split(",") : undefined));
	})
	.delete("/", async (c) => {
		await wipeItems();
		return c.body(null, 204);
	})
	.get("/:id", zValidator("param", itemParamSchema), async (c) => {
		const item = await getItem(c.req.valid("param").id);
		return item ? c.json(item) : c.json({ error: "Item not found" }, 404);
	})
	.get("/:id/crafting-info", zValidator("param", itemParamSchema), async (c) => {
		const info = await getCraftingInfo(c.req.valid("param").id);
		return info ? c.json(info) : c.json({ error: "Item not found" }, 404);
	})
	.get("/:id/breakdown", zValidator("param", itemParamSchema), async (c) => {
		const breakdown = await getBreakdown(c.req.valid("param").id);
		return breakdown ? c.json(breakdown) : c.json({ error: "Item not found" }, 404);
	});
