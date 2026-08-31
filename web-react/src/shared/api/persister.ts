import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

const IDB_KEY = "ahprofit-rq-cache";

export function createIDBPersister(): Persister {
	return {
		persistClient: (client: PersistedClient) => set(IDB_KEY, client),
		restoreClient: () => get<PersistedClient>(IDB_KEY),
		removeClient: () => del(IDB_KEY),
	};
}

export const clearPersistedCache = () => del(IDB_KEY);
