/** @format */

import { defineConfig, InlineConfig, mergeConfig } from "vite";

import path from "path";
import electron, { ElectronOptions } from "vite-plugin-electron";

const isDevelopmentMode = process.env["mode"] === "development";

export default defineConfig({
	resolve: {
		preserveSymlinks: true,
	},
	plugins: [
		electron([
			createElectronOptions("main", path.resolve(__dirname, "src/electron-main/TestApp.ts")),
			createElectronOptions("preload", path.resolve(__dirname, "src/electron-preload/preload.ts")),
		]),
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

function createElectronOptions(name: string, entry: string, options: InlineConfig = {}): ElectronOptions {
	const isPreload = name.toLowerCase().includes("preload");
	const baseOptions: ElectronOptions = {
		entry: {
			[name]: entry,
		},
		onstart(lifetime) {
			if (isPreload) {
				lifetime.reload();
				return;
			}

			const args = ["."];
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
	};

	return {
		entry: baseOptions.entry,
		onstart: baseOptions.onstart,
		vite: mergeConfig(baseOptions.vite ?? {}, options ?? {}),
	};
}
