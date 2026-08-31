import { queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export const charactersQuery = queryOptions({
	queryKey: ["characters"],
	queryFn: () => client.characters.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 60_000,
});

export const professionsQuery = queryOptions({
	queryKey: ["professions"],
	queryFn: () => client.characters.professions.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 60_000,
});

export const inventoryQuery = queryOptions({
	queryKey: ["inventory"],
	queryFn: () => client.inventory.$get().then((r) => (r.ok ? r.json() : Promise.reject(r))),
	staleTime: 60_000,
});
