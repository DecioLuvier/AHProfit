import { queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export const configSummaryQuery = queryOptions({
	queryKey: ["config", "summary"],
	queryFn: () => client.items.summary.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 15_000,
});
