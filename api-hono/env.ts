import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	SQLITE_PATH: z.string().min(1).default("./database/ahprofit.sqlite"),
});

export const env = envSchema.parse(process.env);
