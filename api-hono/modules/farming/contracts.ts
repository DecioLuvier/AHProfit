import { z } from "zod";
import { createIdParamSchema } from "../shared/common";

export const farmRouteParamSchema = createIdParamSchema("id");

export const farmingRowSchema = z.object({
	routeName: z.string().min(1),
	itemId: z.number().int().positive(),
	runAt: z.number().int().positive(),
	perHour: z.number().nonnegative(),
});

export type FarmingRow = z.infer<typeof farmingRowSchema>;
