import { keepPreviousData, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { createIDBPersister } from "@/shared/api/persister";
import { BreakpointProvider } from "@/shared/hooks";
import { TooltipProvider } from "@/ui/primitives/tooltip";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false,
			refetchOnReconnect: "always",
			staleTime: 60_000,
			gcTime: 30 * 60_000,
			placeholderData: keepPreviousData,
		},
	},
});

const persister = createIDBPersister();

const Router = __DESKTOP__ ? HashRouter : BrowserRouter;

export function Providers({ children }: { children: ReactNode }) {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				maxAge: 24 * 60 * 60_000,
				dehydrateOptions: {
					shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "auctions",
				},
			}}
		>
			<BreakpointProvider>
				<TooltipProvider>
					<Router>{children}</Router>
				</TooltipProvider>
			</BreakpointProvider>
		</PersistQueryClientProvider>
	);
}
