import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfigTerminal, type TermLine } from "@/features/config/ConfigTerminal";
import { DangerZone } from "@/features/config/DangerZone";
import { baseUrl } from "@/shared/api/client";
import { clearPersistedCache } from "@/shared/api/persister";
import { buildKindTaggedJsonl, buildKindTaggedJsonlFromRows } from "../features/config/bundle";
import { parseLuaSavedVariables } from "../features/config/lua";
import { importUpload } from "../features/config/upload";

type StepStatus = { ok: boolean | null; detail?: string };

interface InventoryCharRow {
	name: string;
	realm: string;
	timestamp: number;
	gold: number;
	items?: Record<string, unknown>[];
	professions?: Record<string, unknown>[];
}

function parseJsonlLines(jsonl: string | undefined): Record<string, unknown>[] {
	if (!jsonl) return [];
	return jsonl
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => JSON.parse(l));
}

function StepNode({
	num,
	title,
	description,
	stepKey,
	status,
	onImport,
	needsFile,
}: {
	num: number;
	title: string;
	description: string;
	stepKey: string;
	status: Record<string, StepStatus>;
	onImport: () => void;
	needsFile: string | null;
}) {
	const s = status[stepKey];
	const running = s?.ok === null;
	const done = s?.ok === true;
	const error = s?.ok === false;
	const blocked = !!needsFile && !s;

	const state = running ? "is-running" : done ? "is-done" : error ? "is-error" : blocked ? "is-blocked" : "is-ready";
	const sub = running || done || error ? s?.detail : blocked ? `Load ${needsFile} first` : description;

	return (
		<li className={`cfgx-step ${state}`}>
			<span className="cfgx-step-num" aria-hidden="true">
				{done ? "✓" : num}
			</span>
			<div className="cfgx-step-body">
				<div className="cfgx-step-top">
					<span className="cfgx-step-name">{title}</span>
					{!blocked && (
						<button
							type="button"
							className={`cfgx-step-btn${done ? " is-ghost" : ""}`}
							onClick={onImport}
							disabled={running}
						>
							{running ? "Importing…" : done ? "Re-import" : "Import"}
						</button>
					)}
				</div>
				<span className="cfgx-step-sub">{sub}</span>
			</div>
		</li>
	);
}

function FileDrop({ label, loaded, onFile }: { label: string; loaded: boolean; onFile: (t: string) => void }) {
	return (
		<label className={`cfgx-drop${loaded ? " is-loaded" : ""}`}>
			<span className="cfgx-drop-icon" aria-hidden="true">
				{loaded ? "✓" : "↑"}
			</span>
			<span className="cfgx-drop-body">
				<span className="cfgx-drop-name">{label}</span>
				<span className="cfgx-drop-hint">
					{loaded ? "Loaded — click to replace" : "Pick the .lua file from the addon"}
				</span>
			</span>
			<input type="file" accept=".lua" onChange={(e) => e.target.files?.[0]?.text().then(onFile)} />
		</label>
	);
}

export function ConfigPage() {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<Record<string, StepStatus>>({});
	const [itemsLuaText, setItemsLuaText] = useState<string | null>(null);
	const [svLuaText, setSvLuaText] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const [log, setLog] = useState<TermLine[]>([]);

	function pushLog(text: string, tone?: TermLine["tone"]) {
		const ts = new Date().toLocaleTimeString([], { hour12: false });
		setLog((prev) => [...prev, { text: `${ts}  ${text}`, tone }]);
	}

	function formatEta(seconds: number): string {
		if (seconds <= 0) return "almost done…";
		if (seconds < 60) return `~${seconds}s left`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return secs > 0 ? `~${mins}m ${secs}s left` : `~${mins}m left`;
	}

	function setStep(key: string, s: StepStatus) {
		setStatus((prev) => ({ ...prev, [key]: s }));
		if (s.ok === true) {
			setRefreshKey((k) => k + 1);
			queryClient.invalidateQueries({ refetchType: "all" });
			void clearPersistedCache();
		}
	}

	async function runStep(key: string, url: string, jsonl: string, label: string) {
		const trimmed = jsonl.trim();
		if (!trimmed) {
			setStep(key, { ok: true, detail: `0 ${label} processed` });
			pushLog(`${label}: nothing to import`);
			return;
		}
		const count = trimmed.split("\n").filter(Boolean).length;
		const startTime = Date.now();

		setStep(key, { ok: null, detail: `Importing ${count.toLocaleString()} ${label}…` });
		pushLog(`▶ ${label} — ${count.toLocaleString()} rows`, "sys");

		try {
			await importUpload(url, jsonl, (stage) => {
				setStep(key, { ok: null, detail: `${stage} (${count.toLocaleString()} ${label})` });
				pushLog(`  ${label}: ${stage}`, "in");
			});
			const totalElapsed = (Date.now() - startTime) / 1000;
			setStep(key, { ok: true, detail: `${count.toLocaleString()} ${label} imported in ${totalElapsed.toFixed(1)}s` });
			pushLog(`✓ ${label} — ${count.toLocaleString()} in ${totalElapsed.toFixed(1)}s`, "ok");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setStep(key, { ok: false, detail: msg });
			pushLog(`✕ ${label}: ${msg}`, "err");
		}
	}

	async function importItemsBundle() {
		if (!itemsLuaText) return;
		const db = parseLuaSavedVariables(itemsLuaText) as Record<string, string>;
		const jsonl = buildKindTaggedJsonl([
			{ kind: "item", jsonl: db.jsonl_items },
			{ kind: "crafting", jsonl: db.jsonl_crafting },
			{ kind: "disenchanting", jsonl: db.jsonl_disenchanting },
		]);
		await runStep("items", `${baseUrl}/items/import`, jsonl, "items");
	}

	async function importAuctions() {
		if (!svLuaText) return;
		const db = parseLuaSavedVariables(svLuaText) as Record<string, string>;
		await runStep("auctions", `${baseUrl}/auctions/import`, db.jsonl_auctions ?? "", "auctions");
	}

	async function importCharacters() {
		if (!svLuaText) return;
		const db = parseLuaSavedVariables(svLuaText) as Record<string, string>;
		await runStep("characters", `${baseUrl}/characters/import`, db.jsonl_characters ?? "", "characters");
	}

	async function importFarming() {
		if (!svLuaText) return;
		const db = parseLuaSavedVariables(svLuaText) as Record<string, string>;
		await runStep("farming", `${baseUrl}/farming/import`, db.jsonl_farming ?? "", "farming routes");
	}

	async function importInventory() {
		if (!svLuaText) return;
		const db = parseLuaSavedVariables(svLuaText) as Record<string, string>;
		const rows = parseJsonlLines(db.jsonl_playersInventory) as unknown as InventoryCharRow[];
		if (rows.length === 0) {
			setStep("inventory", { ok: true, detail: "0 characters processed" });
			return;
		}
		const startTime = Date.now();
		const initialEstSecs = Math.max(1, Math.round(rows.length * 0.4));
		setStep("inventory", { ok: null, detail: `0/${rows.length} characters… (${formatEta(initialEstSecs)})` });
		pushLog(`▶ inventory — ${rows.length} characters`, "sys");
		let done = 0;
		try {
			for (const row of rows) {
				const jsonl = buildKindTaggedJsonlFromRows([
					{ kind: "item", rows: row.items },
					{ kind: "profession", rows: row.professions },
				]);
				const query = `name=${encodeURIComponent(row.name)}&realm=${encodeURIComponent(row.realm)}&timestamp=${row.timestamp}&gold=${row.gold}`;
				await importUpload(`${baseUrl}/inventory/import?${query}`, jsonl);
				done++;
				const avgPerChar = (Date.now() - startTime) / done;
				const remainingSecs = Math.max(0, Math.ceil(((rows.length - done) * avgPerChar) / 1000));
				const etaText = rows.length > done ? ` (${formatEta(remainingSecs)})` : "";
				setStep("inventory", { ok: null, detail: `${done}/${rows.length} characters…${etaText}` });
				pushLog(`  inventory: ${row.name}-${row.realm} (${done}/${rows.length})`, "in");
			}
			const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			setStep("inventory", { ok: true, detail: `${done}/${rows.length} characters imported in ${totalElapsed}s` });
			pushLog(`✓ inventory — ${done}/${rows.length} in ${totalElapsed}s`, "ok");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setStep("inventory", { ok: false, detail: `${msg} (${done}/${rows.length} done)` });
			pushLog(`✕ inventory: ${msg} (${done}/${rows.length} done)`, "err");
		}
	}

	return (
		<div className="view-fill config-page">
			<div className="config-content">
				<section className="cfg-panel cfg-combined">
					<div className="cfg-sec cfg-sec--files">
						<div className="cfg-subhead">
							<span>Source files</span>
						</div>
						<div className="cfg-files">
							<FileDrop label="Items.lua" loaded={!!itemsLuaText} onFile={setItemsLuaText} />
							<FileDrop label="SavedVariables.lua" loaded={!!svLuaText} onFile={setSvLuaText} />
						</div>
					</div>

					<div className="cfg-split">
						<div className="cfg-sec cfg-sec--import">
							<div className="cfg-subhead">
								<span>Import</span>
							</div>
							<ol className="cfgx-timeline">
								<StepNode
									num={1}
									title="Items bundle"
									description="Item catalog, recipes and disenchanting data."
									stepKey="items"
									status={status}
									onImport={importItemsBundle}
									needsFile={itemsLuaText ? null : "Items.lua"}
								/>
								<StepNode
									num={2}
									title="Auctions"
									description="Auction house listings and prices."
									stepKey="auctions"
									status={status}
									onImport={importAuctions}
									needsFile={svLuaText ? null : "SavedVariables.lua"}
								/>
								<StepNode
									num={3}
									title="Characters"
									description="Character info, race, class and realm."
									stepKey="characters"
									status={status}
									onImport={importCharacters}
									needsFile={svLuaText ? null : "SavedVariables.lua"}
								/>
								<StepNode
									num={4}
									title="Farming"
									description="Farm routes and items per hour."
									stepKey="farming"
									status={status}
									onImport={importFarming}
									needsFile={svLuaText ? null : "SavedVariables.lua"}
								/>
								<StepNode
									num={5}
									title="Inventory"
									description="Bag contents and professions per character."
									stepKey="inventory"
									status={status}
									onImport={importInventory}
									needsFile={svLuaText ? null : "SavedVariables.lua"}
								/>
							</ol>
						</div>

						<div className="cfg-sec cfg-sec--manage">
							<div className="cfg-subhead">
								<span>Manage data</span>
								<span className="cfg-subhead-hint">Wiping is permanent</span>
							</div>
							<DangerZone refreshKey={refreshKey} />
						</div>
					</div>
				</section>

				<ConfigTerminal lines={log} />
			</div>
		</div>
	);
}
