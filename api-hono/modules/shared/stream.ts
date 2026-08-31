import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { streamText } from "hono/streaming";
import type { StreamingApi } from "hono/utils/stream";
import type { ZodType } from "zod";
import { sqlite } from "../../database/db";

async function* validate(body: ReadableStream, schema: ZodType, n: { ok: number; bad: number }, s: StreamingApi) {
	const stream = Readable.fromWeb(body.pipeThrough(new DecompressionStream("gzip")) as any);
	let batch: any[] = [];
	let lineNo = 0;

	for await (const line of createInterface({ input: stream })) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		lineNo++;

		let row: unknown;
		try {
			row = JSON.parse(trimmed);
		} catch {
			n.bad++;
			await s.writeln(`[skipped] line ${lineNo}: not valid JSON`);
			continue;
		}

		const parsed = schema.safeParse(row);
		if (!parsed.success) {
			n.bad++;
			const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "row"} ${i.message}`).join("; ");
			await s.writeln(`[skipped] line ${lineNo}: ${detail}`);
			continue;
		}

		batch.push(parsed.data);
		if (batch.length >= 1000) {
			n.ok += batch.length;
			yield batch;
			batch = [];
		}
	}

	if (batch.length > 0) {
		n.ok += batch.length;
		yield batch;
	}
}

export const importJsonl = (
	schema: ZodType,
	run: (batches: AsyncIterable<any[]>, s: StreamingApi, c: Context) => Promise<void>,
) =>
	createMiddleware(async (c) =>
		streamText(c, async (s) => {
			const n = { ok: 0, bad: 0 };
			try {
				if (!c.req.raw.body) throw new Error("request body is empty; expected gzipped JSONL");
				await s.writeln("[start] processing...");

				sqlite.run("BEGIN");
				try {
					await run(validate(c.req.raw.body, schema, n, s), s, c);
					sqlite.run("COMMIT");
				} catch (err) {
					if (sqlite.inTransaction) sqlite.run("ROLLBACK");
					throw err;
				}

				await s.writeln(`[done] Completed: ${n.ok} rows processed (${n.bad} skipped).`);
			} catch (err) {
				await s.writeln(`[error] ${err instanceof Error ? err.message : err}`);
			}
		}),
	);
