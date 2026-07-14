import type { IAppService } from "electron-ass/main/services/AppService";
import type { WindowManageService } from "./services/WindowManageService";

import { globalShortcut } from "electron";
import { ElectronApp } from "electron-ass/main/ElectronApp";
import { Autowired, ElectronApplication } from "electron-ass/main/decorators";

import "./services";

@ElectronApplication
class TestApp extends ElectronApp {
	@Autowired
	private readonly appService!: IAppService;
	declare protected readonly windowManageService: WindowManageService;

	override initApplication(): boolean {
		const app = this.appService.getInstance();
		if (process.env["VITE_DEV_SERVER_URL"]) {
			app.commandLine.appendSwitch("remote-debugging-port", "9333");
			app.whenReady().then(() => {
				globalShortcut.register("Ctrl+Shift+I", () => {
					const win = this.windowManageService.getActiveWindow();
					if (win) {
						win.webContents.openDevTools();
					}
				});
			});
		}

		app
			.on("activate", () => {
				if (this.windowManageService.getAllWindows().length === 0) {
					this.windowManageService.createMainWindow();
				}
			})
			.on("will-quit", () => {
				globalShortcut.unregisterAll();
			})
			.on("window-all-closed", () => {
				if (process.platform !== "darwin") {
					app.quit();
				}
			});
		return true;
	}

	override startup(): Promise<void> {
		this.windowManageService.createMainWindow();
		return Promise.resolve();
	}
}
