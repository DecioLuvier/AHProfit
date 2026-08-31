import { AppShell } from "@/app/layouts/AppShell";
import { AppRoutes } from "@/app/router";

export default function App() {
	return (
		<AppShell>
			<AppRoutes />
		</AppShell>
	);
}
