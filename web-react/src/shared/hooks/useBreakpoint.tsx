import { createContext, type ReactNode, useContext } from "react";
import { useMediaQuery } from "./useMediaQuery";

export const BREAKPOINTS = {
	mobile: "(max-width: 767px)",
	tablet: "(min-width: 768px) and (max-width: 1023px)",
	desktop: "(min-width: 1024px)",
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const BreakpointContext = createContext<Breakpoint>("desktop");

export function BreakpointProvider({ children }: { children: ReactNode }) {
	const isMobile = useMediaQuery(BREAKPOINTS.mobile);
	const isTablet = useMediaQuery(BREAKPOINTS.tablet);
	const value: Breakpoint = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

	return <BreakpointContext.Provider value={value}>{children}</BreakpointContext.Provider>;
}

export function useBreakpoint(): Breakpoint {
	return useContext(BreakpointContext);
}

export function useIsMobile(): boolean {
	return useContext(BreakpointContext) === "mobile";
}

export function useIsDesktop(): boolean {
	return useContext(BreakpointContext) === "desktop";
}
