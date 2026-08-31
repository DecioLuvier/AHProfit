declare module "lua-json" {
	export function parse(luaSource: string): unknown;
	export function format(value: unknown, options?: Record<string, unknown>): string;
}
