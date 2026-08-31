import { queryOptions } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export const sidebarStatsQuery = queryOptions({
	queryKey: ["sidebar", "stats"],
	queryFn: async () => {
		const [charsRes, countRes, profRes] = await Promise.all([
			client.characters.$get(),
			client.items.count.$get(),
			client.characters.professions.$get(),
		]);
		const stats = { itemsInCatalog: 0, itemsInAuctionHouse: 0, professionsTracked: 0, characterCount: 0, totalGold: 0 };
		if (charsRes.ok) {
			const c = await charsRes.json();
			stats.characterCount = c.length;
			stats.totalGold = c.reduce((s, x) => s + (x.current_gold ?? 0), 0);
		}
		if (countRes.ok) {
			const c = await countRes.json();
			stats.itemsInCatalog = c.total;
			stats.itemsInAuctionHouse = c.withPrice;
		}
		if (profRes.ok) {
			stats.professionsTracked = (await profRes.json()).length;
		}
		return stats;
	},
	staleTime: 60_000,
});
