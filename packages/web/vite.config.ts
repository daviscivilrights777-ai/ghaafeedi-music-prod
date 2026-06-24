import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";
import honoDevPlugin from "./vite/plugins/hono-dev-plugin";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, root, '');
	Object.assign(process.env, env);

	return {
		plugins: [honoDevPlugin(), react(), ...(mode !== "production" ? [runableAnalyticsPlugin()] : []), tailwind()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		server: {
			port: 4200,
			allowedHosts: true,
			hmr: { overlay: false },
			cors: false,
		},
		build: {
			target: "esnext",
			minify: "esbuild",
			rollupOptions: {
				output: {
					// Only split our OWN page code — never node_modules.
					manualChunks: (id) => {
						if (id.includes("node_modules/")) return undefined;
						if (id.includes("/pages/admin/")) return "chunk-admin";
						if (id.includes("/pages/onboarding")) return "chunk-onboarding";
						if (id.includes("/pages/demo")) return "chunk-demo";
						if (id.includes("/pages/product")) return "chunk-products";
					},
				},
			},
		},
	};
});
