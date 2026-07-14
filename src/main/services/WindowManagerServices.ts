/** @format */

import type { ILogService } from "./LogService";
import type { IService } from "./ServiceProvider";
import type { Nullable } from "../../common/utils";
import type { IEventService } from "./EventService";
import type { BrowserWindowConstructorOptions, OpenDialogOptions } from "electron";
import type { ICommonWindowManageService, ISize, IResizeOptions } from "../../common/services/IWindowManageService";

import { app } from "electron/main";
import { IpcEvents } from "../../common/events";
import { Animation } from "../../common/utils/Animate";
import { BrowserWindow, shell, dialog } from "electron";
import { WindowManageServiceDomain } from "../../common/services/IWindowManageService";
import {
	Service,
	Autowired,
	ChannelHandlerProvider,
	HandleChannel,
	ListenChannel,
	AutoTransferHandleChannel,
	AutoTransferListenChannel,
} from "../decorators";

@Service
@ChannelHandlerProvider(WindowManageServiceDomain)
export class WindowManageService implements IWindowManageService {
	private _windows: Map<string, BrowserWindow>;
	private _mainWindow: Nullable<BrowserWindow>;

	@Autowired
	protected readonly logService!: ILogService;
	@Autowired
	protected readonly eventService!: IEventService;

	constructor() {
		this._windows = new Map();
		this._mainWindow = null;
	}

	protected async _createMainWindow() {
		const win = await this.createWindow("");
		win.loadURL("http://www.electronjs.org");
		return win;
	}

	protected _close(window: BrowserWindow) {
		if (window.isDestroyed()) {
			return;
		}

		const wndUrl = Array.from(this._windows.entries()).find(([_, wnd]) => wnd === window)![0];
		this._windows.delete(wndUrl);

		this.logService.info(`WindowManageService::_close: Closed window with URL: ${window.webContents.getURL()}`);

		window.removeAllListeners();
		window.destroy();
	}

	@AutoTransferHandleChannel(shell)
	declare openPath: IWindowManageService["openPath"];

	@AutoTransferListenChannel(shell)
	declare openExternal: IWindowManageService["openExternal"];

	@ListenChannel(true)
	close(event: Electron.IpcMainEvent) {
		const curWin = BrowserWindow.fromWebContents(event.sender)!;
		this._close(curWin);
	}

	@HandleChannel(true)
	showOpenDialog(event: Electron.IpcMainEvent, options: OpenDialogOptions) {
		const win = BrowserWindow.fromWebContents(event.sender)!;
		return dialog.showOpenDialogSync(win, options);
	}

	@ListenChannel(true)
	sticky(event: Electron.IpcMainEvent, value: boolean) {
		const curWin = BrowserWindow.fromWebContents(event.sender)!;
		if (curWin) {
			curWin.setAlwaysOnTop(value, "screen-saver");
		}
	}

	@HandleChannel(true)
	resize(event: Electron.IpcMainEvent, size: Partial<ISize>, options?: IResizeOptions) {
		return new Promise<void>((resolve) => {
			const win = BrowserWindow.fromWebContents(event.sender)!;
			win._cancelAnimate?.();

			size.width && (size.width = Math.ceil(size.width));
			size.height && (size.height = Math.ceil(size.height));

			if (!options?.animate) {
				win.setBounds(size, true);
				if (options?.center) {
					win.center();
				}
				resolve();
				return;
			}

			const duration = options.animateDuration || 100;

			const [startWidth, startHeight] = win.getSize();
			const [startX, startY] = win.getPosition();

			const centerX = startX + startWidth / 2;
			const centerY = startY + startHeight / 2;

			const dw = size.width! - startWidth;
			const dh = size.height! - startHeight;

			const frameRate = 60;
			const totalFrames = Math.max(1, Math.round(duration / (1000 / frameRate)));
			let currentFrame = 0;

			const completeAnimation = () => {
				if (win._animateInterval) {
					clearInterval(win._animateInterval);
					delete win._animateInterval;
				}
				delete win._cancelAnimate;
				resolve();
			};

			win._cancelAnimate = completeAnimation;
			win._animateInterval = setInterval(() => {
				const t = currentFrame / totalFrames;
				const easedT = Animation.easeInOutQuad(t);

				const width = dw > 0 ? Math.round(startWidth + dw * easedT) : Math.floor(startWidth + dw * easedT);
				const height = dh > 0 ? Math.round(startHeight + dh * easedT) : Math.floor(startHeight + dh * easedT);

				const x = Math.round(centerX - width / 2);
				const y = Math.round(centerY - height / 2);

				win.setBounds({ x, y, width, height });

				currentFrame++;
				if (currentFrame >= totalFrames) {
					win.setBounds({
						x: Math.round(centerX - size.width! / 2),
						y: Math.round(centerY - size.height! / 2),
						width: size.width,
						height: size.height,
					});
					completeAnimation();
				}
			}, 1000 / frameRate);
		});
	}

	async createWindow(url: string, options: BrowserWindowConstructorOptions = {}) {
		if (!app.isReady()) {
			await app.whenReady();
		}

		this.logService.info(`WindowManageService::createWindow: With url: ${url}, preload: ${options.webPreferences?.preload}`);
		const win = new BrowserWindow(options);
		this._windows.set(url, win);

		win.on("close", async (_) => {
			_.preventDefault();
			const res = await this.eventService.invokeIpcEvent(win.webContents, IpcEvents.windowBeforeClose);
			if (!res || res.length === 0 || res.every((val) => val)) {
				this._close(win);
			}
		});
		win.on("focus", () => {
			this.eventService.sendIpcEvent(win.webContents, IpcEvents.windowFocus);
		});
		win.on("blur", () => {
			this.eventService.sendIpcEvent(win.webContents, IpcEvents.windowBlur);
		});

		win.webContents
			.on("did-start-loading", () => {
				this.logService.info(`WindowManageService::createWindow: Started loading ${url}`);
			})
			.on("preload-error", (event, preloadPath, error) => {
				this.logService.error(`WindowManageService::createWindow: Preload error in ${preloadPath}: ${error}`);
			})
			.on("did-finish-load", () => {
				this.logService.info(`WindowManageService::createWindow: Finished loading ${url}`);
			});

		return win;
	}

	async createMainWindow() {
		if (this._mainWindow) {
			return this._mainWindow;
		}

		this._mainWindow = await this._createMainWindow();
		return this._mainWindow;
	}

	getMainWindow() {
		return this._mainWindow;
	}

	getActiveWindow() {
		return BrowserWindow.getFocusedWindow();
	}

	getAllWindows() {
		return BrowserWindow.getAllWindows();
	}

	getWindow(url: string): Nullable<BrowserWindow> {
		return this._windows.get(url) || null;
	}

	closeAllWindows() {
		this._windows.forEach((win) => this._close(win));
	}
}

export interface IWindowManageService extends ICommonWindowManageService, IService {
	/**
	 * Create a new window with the specified URL and options.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} url - The URL to load in the new window, it can be a remote URL or a local file path.
	 * @param {BrowserWindowConstructorOptions} [option] - Optional BrowserWindow constructor options to customize the new window.
	 */
	createWindow(url: string, option?: BrowserWindowConstructorOptions): Promise<BrowserWindow>;

	/**
	 * Create the main application window.
	 *
	 * @author Karelian_na
	 * @date 2023/08/23
	 */
	createMainWindow(): Promise<BrowserWindow>;

	/**
	 * Get the main application window.
	 *
	 * @author Karelian_na
	 * @date 2023/08/09
	 */
	getMainWindow(): Nullable<BrowserWindow>;

	/**
	 * Get the valid page url according to the current environment, it will return the dev server url in development and the file path in production..
	 *
	 * @author Karelian_na
	 * @date 2023/08/07
	 */
	getActiveWindow(): Nullable<BrowserWindow>;

	/**
	 * Get all windows of the current application.
	 *
	 * @author Karelian_na
	 * @date 2023/08/08
	 */
	getAllWindows(): Array<BrowserWindow>;

	/**
	 * Get a specific window by its URL.
	 *
	 * @author Karelian_na
	 * @date 2026/05/22
	 * @param url the window URL
	 */
	getWindow(url: string): Nullable<BrowserWindow>;

	/**
	 * close all windows, this method will call {@link BrowserWindow.destroy}
	 * @author Karelian_na
	 * @date 2026/06/21
	 */
	closeAllWindows(): void;
}
