import { z } from "zod";

export const cursorPayloadSchema = z.object({
	id: z.number().int(),
	val: z.union([z.string(), z.number(), z.null()]).optional(),
});

export type CursorPayload = z.infer<typeof cursorPayloadSchema>;

export function encodeCursor(data: unknown) {
	return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(str?: string): CursorPayload | null {
	if (!str) return null;

	try {
		const rawData = JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
		const parsed = cursorPayloadSchema.safeParse(rawData);

		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
