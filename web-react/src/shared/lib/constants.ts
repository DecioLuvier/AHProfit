export const QUALITY_COLORS: Record<string, string> = {
	Poor: "#9d9d9d",
	Common: "#ffffff",
	Uncommon: "#1eff00",
	Rare: "#0070dd",
	Epic: "#a335ee",
	Legendary: "#ff8000",
	Artifact: "#e6cc80",
	Heirloom: "#00ccff",
};

export const EXPANSIONS = [
	"Classic",
	"The Burning Crusade",
	"Wrath of the Lich King",
	"Cataclysm",
	"Mists of Pandaria",
	"Warlords of Draenor",
	"Legion",
	"Battle for Azeroth",
	"Shadowlands",
	"Dragonflight",
	"The War Within",
	"Midnight",
] as const;

export const MIN_SEARCH_LENGTH = 3;

export const PROFESSION_BY_ID: Record<number, string> = {
	171: "Alchemy",
	164: "Blacksmithing",
	333: "Enchanting",
	202: "Engineering",
	182: "Herbalism",
	773: "Inscription",
	755: "Jewelcrafting",
	165: "Leatherworking",
	186: "Mining",
	393: "Skinning",
	197: "Tailoring",
};
