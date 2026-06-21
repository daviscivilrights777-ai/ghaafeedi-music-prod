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
			// Let Vite handle chunking automatically — no manualChunks.
			// manualChunks caused Rollup on Node 24 to lose CJS internal relative
			// imports (e.g. './Client') inside @tanstack/* and simli-client.
		},
	};
});
