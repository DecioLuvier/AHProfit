export function fmtGold(copper: number): string {
	const sign = copper < 0 ? "-" : "";
	const value = Math.abs(Math.round(copper));
	const gold = Math.floor(value / 10000);
	const silver = Math.floor((value % 10000) / 100);
	const bronze = value % 100;
	if (gold > 0) return `${sign}${gold.toLocaleString()}g ${silver}s ${bronze}c`;
	if (silver > 0) return `${sign}${silver}s ${bronze}c`;
	return `${sign}${bronze}c`;
}

export function fmtPercent(value: number | null | undefined): string {
	return value == null ? "—" : `${value.toFixed(1)}%`;
}

export function fmtTime(timestamp: number | null | undefined): string {
	if (timestamp == null) return "—";
	return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function iconUrl(icon: string | null | undefined): string {
	return icon ? `/icons/${icon}.jpg` : "/icons/unknown.jpg";
}

function normalizeAssetName(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function classIconUrl(characterClass: string | null | undefined): string | null {
	return characterClass ? `/icons/classes/${normalizeAssetName(characterClass)}.png` : null;
}

export function raceIconUrl(race: string | null | undefined, gender?: string | null): string | null {
	if (!race) return null;
	const suffix = gender ? `-${normalizeAssetName(gender)}` : "";
	return `/icons/races/${normalizeAssetName(race)}${suffix}.png`;
}
