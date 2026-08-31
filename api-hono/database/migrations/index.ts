import type { Migration, MigrationProvider } from "kysely";

import * as m0001 from "./0001_init_schema";
import * as m0002 from "./0002_farming";
import * as m0003 from "./0003_characters";
import * as m0004 from "./0004_flip_prices";
import * as m0005 from "./0005_auction_batches";

const migrations: Record<string, Migration> = {
	"0001_init_schema": m0001,
	"0002_farming": m0002,
	"0003_characters": m0003,
	"0004_flip_prices": m0004,
	"0005_auction_batches": m0005,
};

export const staticMigrationProvider: MigrationProvider = {
	getMigrations: async () => migrations,
};
