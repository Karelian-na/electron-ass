import type { BrowserWindowConstructorOptions } from "electron";

import { app, screen } from "electron";
import { Service } from "electron-ass/main/decorators/Service";
import { WindowManageService as BWMS, IWindowManageService as IBWMS } from "electron-ass/main/services/WindowManagerServices";

import path from "path";

@Service
export class WindowManageService extends BWMS implements IWindowManageService {
	private _getLocalPathFromOutputDir(...paths: string[]) {
		return path.resolve(app.getAppPath(), "out", ...paths);
	}

	protected override async _createWindow(isMain: boolean, url: string, option: BrowserWindowConstructorOptions = {}) {
		if (!app.isReady()) {
			await app.whenReady();
		}

		const dpi = screen.getPrimaryDisplay().scaleFactor;
		const win = await super._createWindow(
			isMain,
			url,
			Object.assign(
				{
					webPreferences: {
						preload: path.resolve(__dirname, "preload.js"),
						nodeIntegration: true,
					},
					width: 480 * dpi,
					height: 360 * dpi,
					titleBarStyle: "hidden",
					titleBarOverlay: {
						color: "#22212b",
						symbolColor: "white",
						height: 40,
					},
					center: true,
					backgroundColor: "#292935",
				} as BrowserWindowConstructorOptions,
				option,
			),
		);

		win.webContents
			.on("preload-error", (_, path, err) => {
				this.logService.error(`WindowManageService::createWindow: Failed to load preload script for path: ${path}, reason: ${err}`);
			})
			.on("did-finish-load", () => {
				this.logService.info(`WindowManageService::createWindow: Successfully load url: ${url}!`);
			})
			.on("did-fail-load", (_, code, err) => {
				this.logService.error(`WindowManageService::createWindow: Failed to load url: ${url}, reason: ${err}(${code})`);
			});

		return win;
	}

	getValidPageUrl(addr: string): string {
		let url = "";
		if (process.env["VITE_DEV_SERVER_URL"]) {
			url = process.env["VITE_DEV_SERVER_URL"] + addr;
		} else {
			url = path.resolve(__dirname, addr);
		}
		return url;
	}

	override async createMainWindow() {
		const url = this.getValidPageUrl("views/index.html");
		return this.createWindow(url, {
			webPreferences: {
				preload: this._getLocalPathFromOutputDir("preload.js"),
				nodeIntegration: true,
			},
		});
	}
}

export interface IWindowManageService extends IBWMS {
	/**
	 * Get the valid page url according to the current environment, it will return the dev server url in development and the file path in production.
	 *
	 * @author Karelian_na
	 * @date 2026/03/16
	 * @param addr - The page address, it can be a relative path or an absolute url.
	 */
	getValidPageUrl(addr: string): string;
}
