/** @format */

import type { IpcEvents } from "../events";
import type { Promisable } from "../utils";
import type { OpenExternalOptions } from "electron";

export interface ISize {
	width: number;
	height: number;
}

export interface IResizeOptions {
	center?: boolean;
	animate?: boolean;
	animateDuration?: number;
	hiddenWhenAnimating?: boolean;
}

export enum MessageType {
	Info,
	Warning,
	Error,
}

/**
 * Common windows api, can be used in main process or renderer process
 *
 * @author Karelian_na
 * @date 2026/05/22
 */
export interface ICommonWindowManageService {
	/**
	 * Open a path in the file explorer.
	 *
	 * @author Karelian_na
	 * @date 2023/07/29
	 * @param {string} path the path to open
	 * @returns {*}  {Promise<string>} Returns the result of the operation, an empty string if successful, otherwise an error message
	 */
	openPath(path: string): Promise<string>;

	/**
	 * Open an external URL in the default browser.
	 *
	 * @author Karelian_na
	 * @date 2023/07/28
	 * @param {string} url the URL to open
	 */
	openExternal(url: string, options?: OpenExternalOptions): void;
}

/**
 * Windows ipc events map, renderer process can add listeners to each event
 *
 * @author Karelian_na
 * @date 2026/05/22
 */
export type WinIpcEventsMap = {
	[IpcEvents.windowBeforeClose](): Promisable<boolean>;
	[IpcEvents.windowFocus](): void;
	[IpcEvents.windowBlur](): void;
	[IpcEvents.onMessageTip](message: string, type: MessageType, duration?: number): void;
};

export const WindowManageServiceDomain = "WindowManageService";
