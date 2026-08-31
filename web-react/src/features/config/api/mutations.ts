import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, type DataSummaryResponse } from "@/shared/api/client";
import { clearPersistedCache } from "@/shared/api/persister";

const KEY = ["config", "summary"] as const;

type Summary = DataSummaryResponse;
type Scope = "auctions" | "inventory-snapshots" | "characters" | "farming" | "items";

const wipeNode = {
	items: client.items,
	auctions: client.auctions,
	characters: client.characters,
	farming: client.farming,
	"inventory-snapshots": client.inventory,
} as const;

function useOptimisticConfigMutation<TVars>(
	mutationFn: (vars: TVars) => Promise<unknown>,
	apply: (prev: Summary, vars: TVars) => Summary,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn,
		onMutate: async (vars: TVars) => {
			await qc.cancelQueries({ queryKey: KEY });
			const prev = qc.getQueryData<Summary>(KEY);
			if (prev) qc.setQueryData<Summary>(KEY, apply(prev, vars));
			return { prev };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
		},
		onSettled: () => {
			void clearPersistedCache();
			return qc.invalidateQueries({ refetchType: "all" });
		},
	});
}

export function useDeleteBatch(scope: "auctions" | "inventory-snapshots") {
	return useOptimisticConfigMutation<number>(
		(timestamp) => wipeNode[scope].$delete({ query: { timestamp: String(timestamp) } }),
		(prev, timestamp) => {
			const field = scope === "auctions" ? "auctionBatches" : "inventoryBatches";
			return { ...prev, [field]: prev[field].filter((b) => b.timestamp !== timestamp) };
		},
	);
}

export function useWipeScope(scope: Scope) {
	return useOptimisticConfigMutation<void>(
		() =>
			scope === "auctions" || scope === "inventory-snapshots"
				? wipeNode[scope].$delete({ query: {} })
				: wipeNode[scope].$delete(),
		(prev) => {
			switch (scope) {
				case "auctions":
					return { ...prev, auctionBatches: [] };
				case "inventory-snapshots":
					return { ...prev, inventoryBatches: [] };
				case "characters":
					return { ...prev, characters: 0 };
				case "farming":
					return { ...prev, farmRoutes: 0 };
				case "items":
					return { ...prev, items: 0 };
			}
		},
	);
}
