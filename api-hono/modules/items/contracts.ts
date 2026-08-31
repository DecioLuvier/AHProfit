import { z } from "zod";
import { createIdParamSchema } from "../shared/common";

export const itemParamSchema = createIdParamSchema("id");

const nn = z.string().nullish();

export const itemRowSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("item"),
		id: z.number().int().positive(),
		name: z.string(),
		slot: z.string(),
		quality: z.string(),
		qualityTier: z.number().int().nonnegative().nullish(),
		icon: nn.transform((v) => v ?? "inv_misc_questionmark"),
		expansion: nn.transform((v) => v ?? "Unknown"),
		itemClass: nn.transform((v) => v ?? "Unknown"),
		itemSubclass: nn.transform((v) => v ?? "Unknown"),
		sellPrice: z.number().nullish(),
	}),
	z.object({
		kind: z.literal("crafting"),
		itemId: z.number().int().positive(),
		reagentItemId: z.number().int().positive(),
		quantity: z.number().int().positive(),
	}),
	z.object({
		kind: z.literal("disenchanting"),
		itemId: z.number().int().positive(),
		disenchantItemId: z.number().int().positive(),
		chancePercent: z.number().nonnegative(),
	}),
]);

export type ItemRow = z.infer<typeof itemRowSchema>;

const boolQueryParam = z
	.union([z.boolean(), z.enum(["true", "false"])])
	.optional()
	.transform((v) => (v === undefined ? undefined : typeof v === "boolean" ? v : v === "true"));

export const listItemsQuerySchema = z.object({
	search: z.string().min(1).optional(),
	quality: z.string().optional(),
	minQualityTier: z.coerce.number().int().nonnegative().optional(),
	maxQualityTier: z.coerce.number().int().nonnegative().optional(),
	qualityTier: z.string().optional(),
	slot: z.string().optional(),
	itemClass: z.string().optional(),
	itemSubclass: z.string().optional(),
	expansion: z.string().optional(),
	isCraftable: boolQueryParam,
	reagentForItemId: z.coerce.number().int().positive().optional(),
	disenchantResultForItemId: z.coerce.number().int().positive().optional(),
	minMarketPrice: z.coerce.number().nonnegative().optional(),
	maxMarketPrice: z.coerce.number().nonnegative().optional(),
	minCraftCost: z.coerce.number().nonnegative().optional(),
	maxCraftCost: z.coerce.number().nonnegative().optional(),
	minFlipPercent: z.coerce.number().optional(),
	maxFlipPercent: z.coerce.number().optional(),
	onlyProfitableCraft: boolQueryParam,
	onlyAboveVendorPrice: boolQueryParam,
	hasAuctionHousePrice: boolQueryParam,
	minMarginPercent: z.coerce.number().optional(),
	maxMarginPercent: z.coerce.number().optional(),
	minListedByName: z.coerce.number().int().nonnegative().optional(),
	maxListedByName: z.coerce.number().int().nonnegative().optional(),
	sortBy: z
		.enum([
			"name",
			"marketPrice",
			"craftCost",
			"disenchantValue",
			"groupVolume",
			"flipPercent",
			"profitMarginPercent",
			"quality",
			"qualityTier",
		])
		.default("name"),
	sortDir: z.enum(["asc", "desc"]).default("asc"),
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const itemFacetsQuerySchema = z.object({
	itemClass: z.string().optional(),
});
