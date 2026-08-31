import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { timestampQuerySchema } from "../shared/common";
import { importJsonl } from "../shared/stream";
import { auctionRowSchema, priceHistoryParamSchema, priceHistoryQuerySchema } from "./contracts";
import { getCurrentListings, getPriceHistory } from "./service.read";
import { insertAuctions, refreshAuctions, wipeAuctions } from "./service.write";

export const auctionRoutes = new Hono()
	.post(
		"/import",
		importJsonl(auctionRowSchema, async (batches, s) => {
			const timestamp = Math.floor(Date.now() / 1000);
			let n = 0;
			for await (const rows of batches) {
				await insertAuctions(timestamp, rows);
				await s.writeln(`[progress] ${(n += rows.length)} listings imported`);
			}
			if (n > 0) {
				await s.writeln("[finalize] rebuilding market...");
				await refreshAuctions(timestamp);
			}
		}),
	)
	.delete("/", zValidator("query", timestampQuerySchema), async (c) => {
		await wipeAuctions(c.req.valid("query").timestamp);
		return c.body(null, 204);
	})
	.get(
		"/:itemId/history",
		zValidator("param", priceHistoryParamSchema),
		zValidator("query", priceHistoryQuerySchema),
		async (c) => {
			const { itemId } = c.req.valid("param");
			const { days } = c.req.valid("query");
			return c.json(await getPriceHistory(itemId, days));
		},
	)
	.get("/:itemId/listings", zValidator("param", priceHistoryParamSchema), async (c) => {
		return c.json(await getCurrentListings(c.req.valid("param").itemId));
	});
