import { writeFileSync } from "node:fs";
import path from "node:path";
import parseArgs from "minimist";
import { z } from "zod";
import { ensureWindowsFirewall, openWindow, portInUse, startServer, withApi } from "./utils.ts";

const cliSchema = z.object({
	serve: z.boolean().default(false),
	connect: z.boolean().default(false),
	bundle: z.boolean().default(false),
	host: z.string().default("0.0.0.0"),
	port: z.coerce.number().default(47615),
	db: z.string().optional(),
	firewall: z.boolean().default(true),
	server: z.string().optional(),
	"webview-url": z.string().optional(),
});

type CliArgs = z.infer<typeof cliSchema>;

async function runServeMode(args: CliArgs): Promise<void> {
	const isLan = !["127.0.0.1", "localhost"].includes(args.host);
	if (isLan && args.firewall) await ensureWindowsFirewall(args.port);

	const db = args.db ?? path.join(process.cwd(), "ahprofit.sqlite");
	const server = await startServer({ host: args.host, port: args.port, db });
	const displayHost = args.host === "0.0.0.0" ? "127.0.0.1" : args.host;

	console.log(`AHProfit server running at http://${displayHost}:${server.port}`);
}

async function runBundleMode(args: CliArgs): Promise<void> {
	const db = args.db ?? path.join(process.cwd(), "ahprofit.sqlite");
	const server = await startServer({ host: "127.0.0.1", port: args.port, db });

	const devUrl = process.env["AHPROFIT_DEV_URL"];
	const localUrl = `http://127.0.0.1:${server.port}`;
	const url = devUrl ? withApi(devUrl, localUrl) : `${localUrl}/`;

	const isCompiled = !/^bun(\.exe)?$/i.test(path.basename(process.execPath));
	const cmd = isCompiled
		? [process.execPath, "--webview-url", url]
		: [process.execPath, Bun.main, "--webview-url", url];

	const child = Bun.spawn(cmd, { stdin: "ignore", stdout: "inherit", stderr: "inherit" });
	await child.exited;
	process.exit(0);
}

try {
	const parsed = cliSchema.safeParse(parseArgs(process.argv.slice(2)));
	if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("\n"));

	const args = parsed.data;

	if (args["webview-url"]) {
		openWindow(args["webview-url"]);
	} else {
		if (![args.serve, args.connect, args.bundle].some(Boolean)) args.bundle = true;

		const modesCount = [args.serve, args.connect, args.bundle].filter(Boolean).length;
		if (modesCount !== 1) throw new Error("Choose exactly one mode: --serve, --connect, or --bundle.");

		if (args.connect && !args.server)
			throw new Error("The --connect mode requires --server (e.g. --server http://host:port).");

		if (args.connect) {
			openWindow(withApi(args.server!));
		} else {
			const checkHost = ["0.0.0.0", "localhost"].includes(args.host) ? "127.0.0.1" : args.host;
			if (portInUse(args.port, checkHost)) throw new Error(`AHProfit is already running (port ${args.port} in use).`);

			await (args.serve ? runServeMode(args) : runBundleMode(args));
		}
	}
} catch (err) {
	const details = err instanceof Error ? (err.stack ?? err.message) : String(err);
	console.error("\nError on starting AHProfit:\n");
	console.error(details);

	try {
		writeFileSync(
			path.join(process.cwd(), "ahprofit.log"),
			`${new Date().toISOString()}\nError on starting AHProfit:\n${details}\n`,
		);
	} catch {}

	if (process.stdout.isTTY) prompt("\nPress enter to exit...");
	process.exit(1);
}
