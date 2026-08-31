import { sql } from "kysely";
import { db } from "../../database/db";
import { AH_SELLER_CUT_RATE } from "../shared/constants";

type Row = {
	itemId: number;
	name: string;
	icon: string;
	quality: string | null;
	quality_tier: number | null;
	quantity: number;
	marketPrice: number | null;
	craftCost: number | null;
	decision: "buy" | "craft" | "unresolved";
	path: string;
	parentPath: string;
};

function fetchNodes(itemId: number) {
	return sql<Row>`
    WITH RECURSIVE tree AS (
      SELECT i.id AS itemId, i.name, i.icon, i.quality, i.quality_tier, 1 AS quantity,
             i.market_price AS marketPrice, i.craft_cost AS craftCost,
             '/' || i.id || '/' AS path, '' AS parentPath, 0 AS depth
      FROM items i WHERE i.id = ${itemId}
      UNION ALL
      SELECT i.id, i.name, i.icon, i.quality, i.quality_tier, ic.quantity,
             i.market_price, i.craft_cost, t.path || i.id || '/', t.path, t.depth + 1
      FROM tree t
      JOIN item_crafting ic ON ic.item_id = t.itemId
      JOIN items i ON i.id = ic.reagent_id
      WHERE t.craftCost IS NOT NULL
        AND (t.marketPrice IS NULL OR t.marketPrice > t.craftCost)
        AND t.depth < 14
        AND instr(t.path, '/' || i.id || '/') = 0
    )
    SELECT itemId, name, icon, quality, quality_tier, quantity, marketPrice, craftCost, path, parentPath,
           CASE
             WHEN marketPrice IS NOT NULL AND (craftCost IS NULL OR marketPrice <= craftCost) THEN 'buy'
             WHEN craftCost IS NOT NULL THEN 'craft'
             ELSE 'unresolved'
           END AS decision
    FROM tree
  `.execute(db);
}

type Node = Row & {
	unitCost: number | null;
	totalCost: number | null;
	children: Node[];
};

function buildTree(rows: Row[]): Node {
	const byPath = new Map<string, Node>();
	let root!: Node;

	for (const row of rows) {
		let unitCost: number | null = null;
		if (row.decision === "buy") unitCost = row.marketPrice;
		else if (row.decision === "craft") unitCost = row.craftCost;

		const node: Node = {
			...row,
			unitCost,
			totalCost: unitCost === null ? null : unitCost * row.quantity,
			children: [],
		};

		byPath.set(row.path, node);
		if (row.parentPath === "") root = node;
		else byPath.get(row.parentPath)?.children.push(node);
	}

	return root;
}

export async function getBreakdown(itemId: number) {
	const { rows } = await fetchNodes(itemId);
	if (rows.length === 0) return null;

	const tree = buildTree(rows);
	const { marketPrice, totalCost } = tree;

	const sellNet = marketPrice === null ? null : marketPrice * AH_SELLER_CUT_RATE;
	const profitAbsolute = sellNet === null || totalCost === null ? null : sellNet - totalCost;
	const roiPercent = profitAbsolute === null || !totalCost ? null : (profitAbsolute / totalCost) * 100;

	return { tree, sellNet, profitAbsolute, roiPercent };
}
