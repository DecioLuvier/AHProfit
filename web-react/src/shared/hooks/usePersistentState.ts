import { useEffect, useRef, useState } from "react";

type Serde<T> = {
	serialize: (value: T) => string;
	deserialize: (raw: string) => T;
};

const jsonSerde = <T>(): Serde<T> => ({
	serialize: (value) => JSON.stringify(value),
	deserialize: (raw) => JSON.parse(raw) as T,
});

export const setSerde: Serde<Set<string>> = {
	serialize: (value) => JSON.stringify([...value]),
	deserialize: (raw) => new Set(JSON.parse(raw) as string[]),
};

export function usePersistentState<T>(
	key: string,
	initialValue: T | (() => T),
	serde: Serde<T> = jsonSerde<T>(),
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const serdeRef = useRef(serde);
	serdeRef.current = serde;

	const [state, setState] = useState<T>(() => {
		try {
			const raw = key ? localStorage.getItem(key) : null;
			if (raw !== null) return serde.deserialize(raw);
		} catch {}
		return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
	});

	useEffect(() => {
		if (!key) return;
		try {
			localStorage.setItem(key, serdeRef.current.serialize(state));
		} catch {}
	}, [key, state]);

	return [state, setState];
}
