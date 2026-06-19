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
		plugins: [honoDevPlugin(), react(), runableAnalyticsPlugin(), tailwind()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		server: {
			port: 4200,
			allowedHosts: true,
			hmr: { overlay: false, },
			cors: false
		},
		build: {
			target: "esnext",
			minify: "esbuild",
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Keep all node_modules in a single vendor bundle to avoid circular deps
						if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "vendor-react";
						if (id.includes("node_modules/framer-motion/")) return "vendor-framer";
						if (id.includes("node_modules/")) return "vendor-libs";
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
