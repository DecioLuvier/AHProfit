import { describe, expect, it } from "bun:test";
import { flipPercent } from "../src/features/market/model";
import type { ItemRow } from "../src/shared/api/client";
import { classIconUrl, fmtGold, fmtPercent, iconUrl, raceIconUrl } from "../src/shared/lib/format";

describe("fmtGold", () => {
	it("splits copper into g/s/c and drops empty leading units", () => {
		expect(fmtGold(123456)).toBe("12g 34s 56c");
		expect(fmtGold(3456)).toBe("34s 56c");
		expect(fmtGold(56)).toBe("56c");
		expect(fmtGold(0)).toBe("0c");
	});

	it("keeps the sign and rounds fractional copper", () => {
		expect(fmtGold(-56)).toBe("-56c");
		expect(fmtGold(-123456)).toBe("-12g 34s 56c");
		expect(fmtGold(99.6)).toBe("1s 0c");
	});
});

describe("fmtPercent", () => {
	it("renders one decimal, em dash for nullish", () => {
		expect(fmtPercent(12.34)).toBe("12.3%");
		expect(fmtPercent(0)).toBe("0.0%");
		expect(fmtPercent(null)).toBe("—");
		expect(fmtPercent(undefined)).toBe("—");
	});
});

describe("icon url helpers", () => {
	it("iconUrl falls back to the unknown sprite", () => {
		expect(iconUrl("inv_misc_gem_01")).toBe("/icons/inv_misc_gem_01.jpg");
		expect(iconUrl(null)).toBe("/icons/unknown.jpg");
	});

	it("class/race helpers normalize casing and punctuation, null when missing", () => {
		expect(classIconUrl("Death Knight")).toBe("/icons/classes/deathknight.png");
		expect(classIconUrl(null)).toBeNull();
		expect(raceIconUrl("Night Elf", "Female")).toBe("/icons/races/nightelf-female.png");
		expect(raceIconUrl("Orc")).toBe("/icons/races/orc.png");
		expect(raceIconUrl(null, "Male")).toBeNull();
	});
});

describe("flipPercent", () => {
	const row = (over: Partial<ItemRow>): ItemRow =>
		({ market_price: null, second_market_price: null, ...over }) as ItemRow;

	it("is the gap from cheapest to 2nd-cheapest as a percentage", () => {
		expect(flipPercent(row({ market_price: 30, second_market_price: 90 }))).toBe(200);
	});

	it("is null when either price is missing or the cheapest is zero", () => {
		expect(flipPercent(row({ market_price: null, second_market_price: 90 }))).toBeNull();
		expect(flipPercent(row({ market_price: 30, second_market_price: null }))).toBeNull();
		expect(flipPercent(row({ market_price: 0, second_market_price: 90 }))).toBeNull();
	});
});
