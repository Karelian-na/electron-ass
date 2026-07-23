/** @format */

import type { IpcEvents } from "../events";
import type { Optional, Promisable } from "../utils";
import type { ICommonEventService, IEventsMap } from "./IEventService";
import type { SaveDialogOptions, OpenExternalOptions, MessageBoxOptions, MessageBoxReturnValue, OpenDialogOptions } from "electron";

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
 * @template IPCEM IPC events map, the devived class should fix this type
 * @template IEM Events map for the window manage service, default is empty, defined in main process and renderer process separately
 * Typically, the renderer process is defined as empty, because window operations occur only in the main process
 */
export interface ICommonWindowManageService<IPCEM extends IEventsMap, IEM extends IEventsMap> extends ICommonEventService<IPCEM, IEM> {
	/**
	 * Open a path in the file explorer.
	 *
	 * @author Karelian_na
	 * @date 2023/07/29
	 * @param {string} path the path to open
	 * @returns {Promise<string>} Returns the result of the operation, an empty string if successful, otherwise an error message
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

	/**
	 * Show a modal dialog for the current window.
	 *
	 * @author Karelian_na
	 * @date 2026/07/23
	 * @param {OpenDialogOptions} options options for the dialog
	 * @returns promise of a string array that the user selected
	 */
	showOpenDialog(options: OpenDialogOptions): Promise<Optional<Array<string>>>;

	/**
	 * Shows the native save-file dialog.
	 *
	 * @author Karelian_na
	 * @date 2026/07/23
	 * @param {SaveDialogOptions} options The save dialog options
	 * @returns The selected file path, or undefined when the dialog is cancelled.
	 */
	showSaveDialog(options: SaveDialogOptions): Promise<Optional<string>>;

	/**
	 * Shows an asynchronous native message box.
	 *
	 * @author Karelian_na
	 * @date 2026/07/23
	 * @returns The selected button index and optional checkbox state.
	 */
	showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
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
