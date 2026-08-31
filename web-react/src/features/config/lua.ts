function decodeLuaString(raw: string): string {
	return raw.replace(/\\(["'\\nrta]|[0-9]{1,3})/g, (_, esc) => {
		if (esc === "n") return "\n";
		if (esc === "r") return "\r";
		if (esc === "t") return "\t";
		if (esc === "a") return "\x07";
		if (esc === "\\" || esc === '"' || esc === "'") return esc;
		return String.fromCharCode(parseInt(esc, 10));
	});
}

export function parseLuaSavedVariables(luaSource: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	const brace = luaSource.indexOf("{");
	if (brace === -1) throw new Error("Lua file doesn't look like a SavedVariables assignment");

	let i = brace + 1;
	const len = luaSource.length;

	while (i < len) {
		while (
			i < len &&
			(luaSource[i] === " " ||
				luaSource[i] === "\t" ||
				luaSource[i] === "\r" ||
				luaSource[i] === "\n" ||
				luaSource[i] === ",")
		)
			i++;
		if (i >= len || luaSource[i] === "}") break;

		let key: string;
		if (luaSource[i] === "[") {
			i++;
			const quote = luaSource[i];
			i++;
			const keyStart = i;
			while (i < len && luaSource[i] !== quote) i++;
			key = luaSource.slice(keyStart, i);
			i++;
			i++;
		} else {
			const keyStart = i;
			while (i < len && luaSource[i] !== " " && luaSource[i] !== "\t" && luaSource[i] !== "=") i++;
			key = luaSource.slice(keyStart, i);
		}

		while (i < len && (luaSource[i] === " " || luaSource[i] === "\t" || luaSource[i] === "=")) i++;

		let value: unknown;
		if (luaSource[i] === "[" && luaSource[i + 1] === "[") {
			i += 2;
			if (luaSource[i] === "\r") i++;
			if (luaSource[i] === "\n") i++;
			const valStart = i;
			const closeIdx = luaSource.indexOf("]]", i);
			if (closeIdx === -1) throw new Error(`Unclosed long string for key "${key}"`);
			value = luaSource.slice(valStart, closeIdx);
			i = closeIdx + 2;
		} else if (luaSource[i] === '"' || luaSource[i] === "'") {
			const quote = luaSource[i];
			i++;
			const valStart = i;
			while (i < len) {
				if (luaSource[i] === "\\") {
					i += 2;
					continue;
				}
				if (luaSource[i] === quote) break;
				i++;
			}
			const raw = luaSource.slice(valStart, i);
			i++;
			value = decodeLuaString(raw);
		} else if (luaSource[i] === "{") {
			i++;
			const lines: string[] = [];
			let depth = 1;
			while (i < len && depth > 0) {
				while (
					i < len &&
					(luaSource[i] === " " ||
						luaSource[i] === "\t" ||
						luaSource[i] === "\r" ||
						luaSource[i] === "\n" ||
						luaSource[i] === ",")
				)
					i++;
				if (i >= len) break;
				if (luaSource[i] === "}") {
					depth--;
					i++;
					continue;
				}
				if (luaSource[i] === "{") {
					depth++;
					i++;
					continue;
				}
				if ((luaSource[i] === '"' || luaSource[i] === "'") && depth === 1) {
					const q = luaSource[i];
					i++;
					const start = i;
					while (i < len) {
						if (luaSource[i] === "\\") {
							i += 2;
							continue;
						}
						if (luaSource[i] === q) break;
						i++;
					}
					lines.push(decodeLuaString(luaSource.slice(start, i)));
					i++;
				} else {
					while (i < len && luaSource[i] !== "," && luaSource[i] !== "}" && luaSource[i] !== "{") {
						if (luaSource[i] === '"' || luaSource[i] === "'") {
							const q = luaSource[i];
							i++;
							while (i < len && luaSource[i] !== q) {
								if (luaSource[i] === "\\") i++;
								i++;
							}
						}
						i++;
					}
				}
			}
			value = lines.length > 0 ? lines.join("\n") : undefined;
		} else {
			const valStart = i;
			while (i < len && luaSource[i] !== "," && luaSource[i] !== "\n" && luaSource[i] !== "\r" && luaSource[i] !== "}")
				i++;
			const raw = luaSource.slice(valStart, i).trim();
			if (raw === "true") value = true;
			else if (raw === "false") value = false;
			else if (raw === "nil") value = null;
			else {
				const n = Number(raw);
				value = isNaN(n) ? raw : n;
			}
		}

		if (key) result[key] = value;
	}

	return result;
}
