/** @format */

import { defineConfig } from "vite";

import path from "path";
import electron from "vite-plugin-electron";

const isDevelopmentMode = process.env["mode"] === "development";

export default defineConfig({
	resolve: {
		preserveSymlinks: true,
	},
	plugins: [
		electron({
			entry: {
				main: path.resolve(__dirname, "src/electron-main/TestApp.ts"),
				preload: path.resolve(__dirname, "src/electron-main/preloads/preload.ts"),
			},
			onstart(lifetime) {
				const args = [".", "--no-sandbox"];
				if (process.env["ELECTRON_MAIN_DEBUG_PORT"]) {
					args.push(`--inspect-brk=${process.env["ELECTRON_MAIN_DEBUG_PORT"]}`);
				}
				lifetime.startup(args);
			},
			vite: {
				esbuild: {
					keepNames: true,
				},
				build: {
					outDir: path.resolve(__dirname, "out"),
					sourcemap: true,
					minify: isDevelopmentMode ? false : "esbuild",
					rollupOptions: {
						external: [/^electron\/.*/],
					},
				},
			},
		}),
	],
	root: path.resolve(__dirname, "src/electron-sandbox"),
	server: {
		host: "localhost",
	},
	build: {
		outDir: path.resolve(__dirname, "out"),
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "src/electron-sandbox/views/index.html"),
			},
		},
	},
});
