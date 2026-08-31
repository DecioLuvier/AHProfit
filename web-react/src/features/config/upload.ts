async function gzip(text: string): Promise<Uint8Array> {
	const source = new ReadableStream<Uint8Array>({
		start(c) {
			c.enqueue(new TextEncoder().encode(text));
			c.close();
		},
	});
	const compressed = source.pipeThrough(new CompressionStream("gzip") as any);
	return new Uint8Array(await new Response(compressed).arrayBuffer());
}

export async function importUpload(url: string, jsonl: string, onStage?: (stage: string) => void): Promise<number> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/gzip" },
		body: (await gzip(jsonl)) as unknown as BodyInit,
	});

	if (res.status !== 200 || !res.body) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error ?? `${res.status} ${res.statusText}`);
	}

	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buf = "";
	let rows = 0;
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		buf += value;
		let nl: number;
		while ((nl = buf.indexOf("\n")) >= 0) {
			const line = buf.slice(0, nl).trim();
			buf = buf.slice(nl + 1);
			if (!line) continue;

			const m = /^\[(\w+)\]\s*(.*)$/.exec(line);
			const tag = m?.[1];
			const msg = m?.[2] ?? line;

			if (tag === "error") throw new Error(msg);
			if (tag === "done") {
				rows = Number(/(\d+)\s+rows/.exec(msg)?.[1] ?? 0);
			} else {
				onStage?.(msg);
			}
		}
	}
	return rows;
}
