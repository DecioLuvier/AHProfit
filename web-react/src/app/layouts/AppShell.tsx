import type { ReactNode } from "react";
import { Background } from "./Background";
import { DesktopShell } from "./DesktopShell";

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<>
			<Background />
			<DesktopShell>{children}</DesktopShell>
		</>
	);
}
