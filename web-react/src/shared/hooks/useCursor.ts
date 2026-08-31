import { usePersistentState } from "./usePersistentState";

export function useCursor(persistKey?: string) {
	const [stack, setStack] = usePersistentState<(string | null)[]>(persistKey ?? "", [null]);

	const cursor = stack[stack.length - 1] ?? null;
	const canGoPrev = stack.length > 1;
	const pageIndex = stack.length - 1;

	function next(nextCursor: string) {
		setStack((prev) => [...prev, nextCursor]);
	}

	function prev() {
		setStack((prevStack) => (prevStack.length > 1 ? prevStack.slice(0, -1) : prevStack));
	}

	function reset() {
		setStack([null]);
	}

	return { cursor, canGoPrev, pageIndex, next, prev, reset };
}
