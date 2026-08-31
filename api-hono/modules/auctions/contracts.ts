import { z } from "zod";
import { createIdParamSchema } from "../shared/common";

export const auctionImportQuerySchema = z.object({
	timestamp: z.coerce.number().int().positive(),
});

export const auctionRowSchema = z.object({
	itemId: z.number().int().positive(),
	count: z.number().int().positive(),
	buyoutPrice: z.number().int().nonnegative(),
});

export type AuctionRow = z.infer<typeof auctionRowSchema>;

export const priceHistoryParamSchema = createIdParamSchema("itemId");

export const priceHistoryQuerySchema = z.object({
	days: z.coerce.number().int().positive().max(365).default(30),
});
