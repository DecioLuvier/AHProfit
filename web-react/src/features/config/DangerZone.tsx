import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fmtTime } from "@/shared/lib/format";
import { useDeleteBatch, useWipeScope } from "./api/mutations";
import { configSummaryQuery } from "./api/queries";
import { InlineConfirm } from "./InlineConfirm";

type Batch = { timestamp: number; count: number };

function SnapshotRow({
	name,
	batches,
	onWipe,
	onDeleteBatch,
}: {
	name: string;
	batches: Batch[];
	onWipe: () => void;
	onDeleteBatch: (ts: number) => void;
}) {
	const rows = batches.reduce((s, b) => s + b.count, 0);
	return (
		<div className="mng-snap">
			<div className="mng-snap-top">
				<span className="mng-snap-name">{name}</span>
				<span className="mng-snap-meta">
					{batches.length === 0
						? "no imports"
						: `${rows.toLocaleString()} rows · ${batches.length} batch${batches.length > 1 ? "es" : ""}`}
				</span>
				<InlineConfirm className="mng-wipe" idleLabel="Wipe all" confirmLabel="Confirm wipe" onConfirm={onWipe} />
			</div>
			{batches.map((b) => (
				<div key={b.timestamp} className="mng-batch">
					<span className="mng-batch-meta">
						{fmtTime(b.timestamp)} · {b.count.toLocaleString()} rows
					</span>
					<InlineConfirm
						className="mng-batch-del"
						idleLabel="×"
						confirmLabel="Delete?"
						title="Delete this batch"
						onConfirm={() => onDeleteBatch(b.timestamp)}
					/>
				</div>
			))}
		</div>
	);
}

function DatasetTile({ name, value, onWipe }: { name: string; value: string; onWipe: () => void }) {
	return (
		<div className="mng-tile">
			<span className="mng-tile-num">{value}</span>
			<span className="mng-tile-name">{name}</span>
			<InlineConfirm className="mng-wipe mng-wipe--sm" idleLabel="Wipe" confirmLabel="Confirm" onConfirm={onWipe} />
		</div>
	);
}

export function DangerZone({ refreshKey }: { refreshKey?: number } = {}) {
	const { data: summary, refetch, isPending, isError, error } = useQuery(configSummaryQuery);

	useEffect(() => {
		if (refreshKey) refetch();
	}, [refreshKey]);

	const wipeAuctions = useWipeScope("auctions");
	const wipeInventory = useWipeScope("inventory-snapshots");
	const wipeCharacters = useWipeScope("characters");
	const wipeFarming = useWipeScope("farming");
	const wipeItems = useWipeScope("items");
	const deleteAuctionBatch = useDeleteBatch("auctions");
	const deleteInventoryBatch = useDeleteBatch("inventory-snapshots");

	if (isPending) {
		return <div className="mng-loading">Loading…</div>;
	}

	if (isError || !summary) {
		const detail =
			error instanceof Response
				? `${error.status} ${error.statusText}`
				: error instanceof Error
					? error.message
					: "request failed";
		return (
			<div className="mng-loading">
				<div>Couldn't load data summary — {detail}.</div>
				<button type="button" className="mng-wipe mng-wipe--sm" onClick={() => refetch()}>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="mng-list">
			<div className="mng-group">
				<div className="mng-snaps">
					<SnapshotRow
						name="Auctions"
						batches={summary.auctionBatches}
						onWipe={() => wipeAuctions.mutate()}
						onDeleteBatch={(ts) => deleteAuctionBatch.mutate(ts)}
					/>
					<SnapshotRow
						name="Inventory"
						batches={summary.inventoryBatches}
						onWipe={() => wipeInventory.mutate()}
						onDeleteBatch={(ts) => deleteInventoryBatch.mutate(ts)}
					/>
				</div>
			</div>

			<div className="mng-group">
				<div className="mng-group-label">Datasets</div>
				<div className="mng-tiles">
					<DatasetTile
						name="Characters"
						value={summary.characters.toLocaleString()}
						onWipe={() => wipeCharacters.mutate()}
					/>
					<DatasetTile
						name="Farming routes"
						value={summary.farmRoutes.toLocaleString()}
						onWipe={() => wipeFarming.mutate()}
					/>
					<DatasetTile name="Items catalog" value={summary.items.toLocaleString()} onWipe={() => wipeItems.mutate()} />
				</div>
			</div>
		</div>
	);
}
