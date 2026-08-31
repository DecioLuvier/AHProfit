import { z } from "zod";
import { createIdParamSchema } from "../shared/common";

export const characterParamSchema = createIdParamSchema("id");

export const characterRowSchema = z.object({
	name: z.string().min(1),
	realm: z.string().min(1),
	race: z.string(),
	class: z.string(),
	gender: z.string(),
});

export const inventoryRowSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("item"),
		itemId: z.number().int().positive(),
		count: z.number().int().positive(),
		location: z.string(),
	}),
	z.object({
		kind: z.literal("profession"),
		professionId: z.number().int().positive(),
		skillLevel: z.number().int().nonnegative(),
		maxSkillLevel: z.number().int().nonnegative(),
	}),
]);

export type CharacterRow = z.infer<typeof characterRowSchema>;
export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export const inventorySnapshotQuerySchema = z.object({
	name: z.string().min(1),
	realm: z.string().min(1),
	timestamp: z.coerce.number().int().positive(),
	gold: z.coerce.number().int().nonnegative(),
});

export const inventorySnapshotsQuerySchema = z.object({
	from: z.coerce.number().int().nonnegative(),
	to: z.coerce.number().int().positive(),
});
