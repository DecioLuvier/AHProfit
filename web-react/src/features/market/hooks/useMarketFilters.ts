import { useMemo } from "react";
import { setSerde, useDebounce, usePersistentState } from "@/shared/hooks";
import { MIN_SEARCH_LENGTH } from "@/shared/lib/constants";

const K = "ah.filters.";

function boolParam(checked: boolean): "true" | undefined {
	return checked ? "true" : undefined;
}

export function useMarketFilters() {
	const [search, setSearch] = usePersistentState(`${K}search`, "");
	const debouncedSearch = useDebounce(search, 300);
	const activeSearch = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch.trim() : undefined;

	const [quality, setQuality] = usePersistentState(`${K}quality`, () => new Set<string>(), setSerde);
	const [qualityTier, setQualityTier] = usePersistentState(`${K}qualityTier`, () => new Set<string>(), setSerde);
	const [expansions, setExpansions] = usePersistentState(`${K}expansions`, () => new Set<string>(), setSerde);
	const [slot, setSlot] = usePersistentState(`${K}slot`, () => new Set<string>(), setSerde);
	const [itemClass, setItemClass] = usePersistentState(`${K}itemClass`, () => new Set<string>(), setSerde);
	const [itemSubclass, setItemSubclass] = usePersistentState(`${K}itemSubclass`, () => new Set<string>(), setSerde);

	const [onlyProfitableCraft, setOnlyProfitableCraft] = usePersistentState(`${K}onlyProfitableCraft`, false);
	const [onlyAboveVendorPrice, setOnlyAboveVendorPrice] = usePersistentState(`${K}onlyAboveVendorPrice`, true);
	const [hasAuctionHousePrice, setHasAuctionHousePrice] = usePersistentState(`${K}hasAuctionHousePrice`, true);
	const [minMarginPercent, setMinMarginPercent] = usePersistentState(`${K}minMarginPercent`, "");
	const [maxMarginPercent, setMaxMarginPercent] = usePersistentState(`${K}maxMarginPercent`, "");
	const [minMarketPrice, setMinMarketPrice] = usePersistentState(`${K}minMarketPrice`, "");
	const [maxMarketPrice, setMaxMarketPrice] = usePersistentState(`${K}maxMarketPrice`, "");
	const [minCraftCost, setMinCraftCost] = usePersistentState(`${K}minCraftCost`, "");
	const [maxCraftCost, setMaxCraftCost] = usePersistentState(`${K}maxCraftCost`, "");
	const [minFlipPercent, setMinFlipPercent] = usePersistentState(`${K}minFlipPercent`, "");
	const [maxFlipPercent, setMaxFlipPercent] = usePersistentState(`${K}maxFlipPercent`, "");
	const [minListedByName, setMinListedByName] = usePersistentState(`${K}minListedByName`, "");
	const [maxListedByName, setMaxListedByName] = usePersistentState(`${K}maxListedByName`, "");

	const itemClassParam = itemClass.size > 0 ? [...itemClass].join(",") : undefined;

	const params = useMemo(() => {
		const qualityParam = quality.size > 0 ? [...quality].join(",") : undefined;
		const qualityTierParam = qualityTier.size > 0 ? [...qualityTier].join(",") : undefined;
		const expansionParam = expansions.size > 0 ? [...expansions].join(",") : undefined;
		const slotParam = slot.size > 0 ? [...slot].join(",") : undefined;
		const itemSubclassParam = itemSubclass.size > 0 ? [...itemSubclass].join(",") : undefined;

		return {
			...(activeSearch ? { search: activeSearch } : {}),
			...(qualityParam ? { quality: qualityParam } : {}),
			...(qualityTierParam ? { qualityTier: qualityTierParam } : {}),
			...(expansionParam ? { expansion: expansionParam } : {}),
			...(slotParam ? { slot: slotParam } : {}),
			...(itemClassParam ? { itemClass: itemClassParam } : {}),
			...(itemSubclassParam ? { itemSubclass: itemSubclassParam } : {}),
			...(boolParam(onlyProfitableCraft) ? { onlyProfitableCraft: "true" } : {}),
			...(boolParam(onlyAboveVendorPrice) ? { onlyAboveVendorPrice: "true" } : {}),
			...(boolParam(hasAuctionHousePrice) ? { hasAuctionHousePrice: "true" } : {}),
			...(minMarginPercent ? { minMarginPercent } : {}),
			...(maxMarginPercent ? { maxMarginPercent } : {}),
			...(minMarketPrice ? { minMarketPrice } : {}),
			...(maxMarketPrice ? { maxMarketPrice } : {}),
			...(minCraftCost ? { minCraftCost } : {}),
			...(maxCraftCost ? { maxCraftCost } : {}),
			...(minFlipPercent ? { minFlipPercent } : {}),
			...(maxFlipPercent ? { maxFlipPercent } : {}),
			...(minListedByName ? { minListedByName } : {}),
			...(maxListedByName ? { maxListedByName } : {}),
		} as Record<string, string | undefined>;
	}, [
		activeSearch,
		quality,
		qualityTier,
		expansions,
		slot,
		itemClassParam,
		itemSubclass,
		onlyProfitableCraft,
		onlyAboveVendorPrice,
		hasAuctionHousePrice,
		minMarginPercent,
		maxMarginPercent,
		minMarketPrice,
		maxMarketPrice,
		minCraftCost,
		maxCraftCost,
		minFlipPercent,
		maxFlipPercent,
		minListedByName,
		maxListedByName,
	]);

	const sheetProps = {
		quality,
		setQuality,
		qualityTier,
		setQualityTier,
		slot,
		setSlot,
		itemClass,
		setItemClass,
		itemSubclass,
		setItemSubclass,
		expansions,
		setExpansions,
		onlyProfitableCraft,
		setOnlyProfitableCraft,
		onlyAboveVendorPrice,
		setOnlyAboveVendorPrice,
		hasAuctionHousePrice,
		setHasAuctionHousePrice,
		minMarginPercent,
		setMinMarginPercent,
		maxMarginPercent,
		setMaxMarginPercent,
		minMarketPrice,
		setMinMarketPrice,
		maxMarketPrice,
		setMaxMarketPrice,
		minCraftCost,
		setMinCraftCost,
		maxCraftCost,
		setMaxCraftCost,
		minFlipPercent,
		setMinFlipPercent,
		maxFlipPercent,
		setMaxFlipPercent,
		minListedByName,
		setMinListedByName,
		maxListedByName,
		setMaxListedByName,
	};

	return { search, setSearch, params, itemClassParam, sheetProps };
}
