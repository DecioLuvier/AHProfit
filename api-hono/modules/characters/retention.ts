export function retentionDeleteSql(table: "character_snapshots" | "character_professions", partition: string) {
	const bucket = (prefix: string, fmt: string) =>
		`'${prefix}:' || ${partition} || ':' || strftime('${fmt}', timestamp, 'unixepoch')`;

	return `
		WITH buckets AS (
			SELECT id, timestamp,
				CASE
					WHEN (unixepoch('now') - timestamp) < 7 * 86400   THEN ${bucket("D", "%Y-%m-%d")}
					WHEN (unixepoch('now') - timestamp) < 30 * 86400  THEN ${bucket("W", "%Y-%W")}
					WHEN (unixepoch('now') - timestamp) < 365 * 86400 THEN ${bucket("M", "%Y-%m")}
					ELSE ${bucket("Y", "%Y")}
				END AS bucket
			FROM ${table}
		),
		keep AS (SELECT bucket, MAX(timestamp) AS keep_timestamp FROM buckets GROUP BY bucket)
		DELETE FROM ${table}
		WHERE id NOT IN (
			SELECT b.id FROM buckets b JOIN keep k ON b.bucket = k.bucket AND b.timestamp = k.keep_timestamp
		)
	`;
}
