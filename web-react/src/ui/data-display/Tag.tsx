import { ItemTag } from "./primitives";

export function Tag({ label, color }: { label: string; color: string }) {
	return <ItemTag label={label} color={color} />;
}
