import { dlopen } from "bun:ffi";
import path from "node:path";
import { $ } from "bun";
import { Hono } from "hono";
import { Webview } from "webview-bun";

export async function ensureWindowsFirewall(port: number): Promise<void> {
	if (process.platform !== "win32") return;

	const rule = "AHProfit Server";
	const show = await $`netsh advfirewall firewall show rule name=${rule} verbose`.nothrow().quiet();

	if (show.exitCode === 0) {
		const ports = show
			.text()
			.split(/\r?\n/)
			.filter((line) => /^\s*LocalPort:/i.test(line))
			.flatMap((line) =>
				line
					.split(":")[1]!
					.split(",")
					.map((p) => p.trim().toLowerCase()),
			);

		if (ports.includes(String(port)) || ports.includes("any")) return;
	}

	console.log(`Allowing TCP port ${port} in firewall (confirm UAC prompt)...`);

	const netshArgs = [
		"advfirewall",
		"firewall",
		"add",
		"rule",
		`name=${rule}`,
		"dir=in",
		"action=allow",
		"protocol=TCP",
		`localport=${port}`,
		"profile=private,domain",
	];
	const argList = netshArgs.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(",");
	const psCommand = `Start-Process netsh -ArgumentList ${argList} -Verb RunAs -Wait`;

	await $`powershell -NoProfile -Command ${psCommand}`.nothrow().quiet();
}

export async function startServer(opts: { host?: string; port?: number; db?: string } = {}) {
	if (opts.db) process.env["SQLITE_PATH"] = opts.db;

	const { app: api } = await import("../api-hono/app.ts").catch((err) => {
		throw new Error(`Failed to load API app: ${err instanceof Error ? err.message : String(err)}`);
	});

	const dist = process.env["AHPROFIT_DIST"] ?? path.join(path.dirname(process.execPath), "dist");
	const indexHtml = path.join(dist, "index.html");

	const serveFile = async (c: any, filePath: string) => {
		const file = Bun.file(filePath);
		if (!(await file.exists())) return null;
		return c.body(file.stream(), 200, { "Content-Type": file.type || "application/octet-stream" });
	};

	const server = new Hono().route("/api", api).get("/*", async (c) => {
		const rel = decodeURIComponent(new URL(c.req.url).pathname).replace(/^\/+/, "");
		const target = path.resolve(dist, rel);
		if (target === dist || target.startsWith(dist + path.sep)) {
			if (rel && !rel.endsWith("/")) {
				const hit = await serveFile(c, target);
				if (hit) return hit;
			}
		}
		const html = await serveFile(c, indexHtml);
		return html ?? c.notFound();
	});

	return Bun.serve({
		hostname: opts.host ?? "127.0.0.1",
		port: opts.port ?? 0,
		fetch: server.fetch,
		idleTimeout: 60,
	});
}

export function withApi(base: string, apiOrigin = base): string {
	const clean = (url: string) => url.replace(/\/+$/, "");
	return `${clean(base)}/?api=${encodeURIComponent(`${clean(apiOrigin)}/api`)}`;
}

export function portInUse(port: number, host = "127.0.0.1"): boolean {
	try {
		const listener = Bun.listen({ hostname: host, port, socket: { data() {} } });
		listener.stop();
		return false;
	} catch (err) {
		if ((err as { code?: string }).code === "EADDRINUSE") return true;
		throw err;
	}
}

function applyWindowIcon(wv: Webview): void {
	if (process.platform !== "win32") return;

	try {
		const hwnd = wv.unsafeWindowHandle;
		if (!hwnd) throw new Error("no hwnd");

		const u32 = dlopen("user32.dll", {
			LoadImageW: { args: ["ptr", "ptr", "u32", "i32", "i32", "u32"], returns: "ptr" },
			SendMessageW: { args: ["ptr", "u32", "u64", "u64"], returns: "ptr" },
			SetClassLongPtrW: { args: ["ptr", "i32", "u64"], returns: "u64" },
		});
		const shell32 = dlopen("shell32.dll", {
			ExtractIconExW: { args: ["ptr", "i32", "ptr", "ptr", "u32"], returns: "u32" },
		});

		const IMAGE_ICON = 1;
		const LR_LOADFROMFILE = 0x0010;
		const LR_DEFAULTSIZE = 0x0040;
		const WM_SETICON = 0x0080;
		const ICON_SMALL = 0;
		const ICON_BIG = 1;
		const GCLP_HICON = -14;
		const GCLP_HICONSM = -34;

		const exeDir = path.dirname(process.execPath);
		let hBig = 0n;
		let hSmall = 0n;

		const exeBuf = Buffer.from(process.execPath + "\0", "utf16le");
		const bigOut = new BigUint64Array(1);
		const smallOut = new BigUint64Array(1);
		shell32.symbols.ExtractIconExW(exeBuf, 0, bigOut, smallOut, 1);
		hBig = bigOut[0]!;
		hSmall = smallOut[0]!;

		if (!hBig) {
			const icoBuf = Buffer.from(path.join(exeDir, "icon.ico") + "\0", "utf16le");
			hBig = BigInt(
				u32.symbols.LoadImageW(null, icoBuf, IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE) as number | bigint,
			);
			hSmall ||= hBig;
		}

		if (!hBig) throw new Error("no icon handle");

		for (const [type, handle] of [
			[ICON_BIG, hBig],
			[ICON_SMALL, hSmall || hBig],
		] as const) {
			u32.symbols.SendMessageW(hwnd, WM_SETICON, BigInt(type), handle);
		}
		u32.symbols.SetClassLongPtrW(hwnd, GCLP_HICON, hBig);
		u32.symbols.SetClassLongPtrW(hwnd, GCLP_HICONSM, hSmall || hBig);
	} catch {}
}

export function openWindow(url: string): void {
	const wv = new Webview(false);
	wv.title = "AHProfit";
	wv.size = { width: 1280, height: 860, hint: 0 };
	applyWindowIcon(wv);
	wv.navigate(url);
	wv.run();
	wv.destroy();
	process.exit(0);
}
