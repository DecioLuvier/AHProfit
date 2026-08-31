export function buildKindTaggedJsonl(sections: { kind: string; jsonl: string | undefined }[]): string {
	const lines: string[] = [];
	for (const { kind, jsonl } of sections) {
		if (!jsonl) continue;
		for (const line of jsonl.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			const row = JSON.parse(trimmed) as Record<string, unknown>;
			row.kind = kind;
			lines.push(JSON.stringify(row));
		}
	}
	return lines.join("\n");
}

export function buildKindTaggedJsonlFromRows(
	sections: { kind: string; rows: Record<string, unknown>[] | undefined }[],
): string {
	const lines: string[] = [];
	for (const { kind, rows } of sections) {
		if (!rows) continue;
		for (const row of rows) lines.push(JSON.stringify({ ...row, kind }));
	}
	return lines.join("\n");
}
