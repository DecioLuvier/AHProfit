import { z } from "zod";

export const createIdParamSchema = (paramName = "id") =>
	z.object({
		[paramName]: z.coerce.number().int().positive(),
	});

export const timestampQuerySchema = z.object({
	timestamp: z.coerce.number().int().positive().optional(),
});
