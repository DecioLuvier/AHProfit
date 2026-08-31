import { Database } from "bun:sqlite";
import { Kysely, type KyselyPlugin, Migrator } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { env } from "../env";
import type { DB } from "./db.d";
import { staticMigrationProvider } from "./migrations";

export const sqlite = new Database(env.SQLITE_PATH, { create: true });

sqlite.exec(`
	PRAGMA journal_mode = WAL;
	PRAGMA synchronous = NORMAL;
	PRAGMA foreign_keys = OFF;
	PRAGMA temp_store = MEMORY;
	PRAGMA cache_size = -65536;
	PRAGMA busy_timeout = 5000;
`);

const BOOL_COLS = new Set(["is_craftable", "is_reagent", "is_disenchantable", "is_disenchant_result"]);
const booleanPlugin: KyselyPlugin = {
	transformQuery: (args) => args.node,
	transformResult: async (args) => {
		for (const row of (args.result.rows as Record<string, unknown>[] | undefined) ?? []) {
			for (const col of BOOL_COLS) if (typeof row[col] === "number") row[col] = row[col] === 1;
		}
		return args.result;
	},
};

export const db = new Kysely<DB>({
	dialect: new BunSqliteDialect({ database: sqlite }),
	plugins: [booleanPlugin],
});

const migrator = new Migrator({ db, provider: staticMigrationProvider });
const { error, results } = await migrator.migrateToLatest();
for (const r of results ?? []) if (r.status === "Error") console.error(`Migration "${r.migrationName}" failed`);
if (error) throw error;

export function closeDb() {
	try {
		sqlite.exec("PRAGMA optimize");
		sqlite.close();
	} catch {}
}

if (typeof process.once === "function") {
	for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => process.exit(0));
	process.once("exit", closeDb);
}
