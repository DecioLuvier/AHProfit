import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
	const isDesktop = mode === "desktop" || process.env.DESKTOP === "1";

	return {
		plugins: [
			tailwindcss(),
			react({
				babel: {
					plugins: [["babel-plugin-react-compiler", { target: "18" }]],
				},
			}),
			...(isDesktop
				? []
				: [
						VitePWA({
							registerType: "autoUpdate",
							devOptions: { enabled: false },
							workbox: {
								globPatterns: ["**/*.{js,css,html,woff2}"],
								globIgnores: ["**/icons/**", "**/assets/hero-bg.*"],
								maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
								navigateFallbackDenylist: [/^\/api/, /^\/icons/, /^\/assets\//],
								runtimeCaching: [
									{
										urlPattern: ({ url }) => url.pathname.startsWith("/icons/"),
										handler: "CacheFirst",
										options: {
											cacheName: "wow-icons",
											expiration: { maxEntries: 2000, maxAgeSeconds: 30 * 24 * 60 * 60 },
										},
									},
									{
										urlPattern: ({ url }) => url.port === "3000" || url.pathname.startsWith("/api"),
										handler: "NetworkOnly",
									},
								],
							},
						}),
					]),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		define: {
			__DESKTOP__: JSON.stringify(isDesktop),
		},
		optimizeDeps: {
			include: [
				"react",
				"react-dom/client",
				"react-router-dom",
				"@tanstack/react-query",
				"@tanstack/react-query-persist-client",
				"idb-keyval",
				"recharts",
				"lucide-react",
				"clsx",
				"class-variance-authority",
				"tailwind-merge",
				"hono/client",
			],
		},
		server: {
			port: 5173,
			proxy: {
				"/api": {
					target: process.env.VITE_API_TARGET ?? "http://localhost:3000",
					changeOrigin: true,
					rewrite: (p) => p.replace(/^\/api/, ""),
				},
			},
			watch: {
				ignored: ["**/public/icons/**", "**/examples/**", "**/database/*.sqlite*"],
			},
			warmup: {
				clientFiles: [
					"./src/main.tsx",
					"./src/App.tsx",
					"./src/pages/HomePage.tsx",
					"./src/pages/MarketPage.tsx",
					"./src/pages/ItemDetailPage.tsx",
					"./src/pages/FarmingPage.tsx",
					"./src/pages/CharactersPage.tsx",
					"./src/pages/ConfigPage.tsx",
				],
			},
		},
	};
});
