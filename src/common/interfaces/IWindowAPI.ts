/** @format */

import type { OpenDialogOptions } from "electron";
import type { ICommonWindowManageService, IResizeOptions, ISize, WinIpcEventsMap } from "../services/IWindowManageService";

/**
 * Windows api exported to renderer process.
 *
 * @author Karelian_na
 * @date 2026/05/22
 * @template IPCEM IPC events map, default is {@link WinIpcEventsMap}
 */
export interface IWindowAPI<IPCEM extends WinIpcEventsMap = WinIpcEventsMap> extends ICommonWindowManageService<IPCEM, {}> {
	/**
	 * Close the current window.
	 *
	 * @author Karelian_na
	 * @date 2023/09/24
	 */
	close(): void;

	/**
	 * Stick the current window to the top of the screen.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {boolean} [value] true to sticky the window, false to cancel it
	 */
	sticky(value: boolean): void;

	/**
	 * Show a modal dialog for the current window.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {OpenDialogOptions} options options for the dialog
	 * @returns {*}  {Promise<Array<string>>} promise of a string array that the user selected
	 */
	showOpenDialog(options: OpenDialogOptions): Promise<Array<string>>;

	/**
	 * Resize the window.
	 *
	 * @author Karelian_na
	 * @date 2023/08/13 22:32:00
	 * @param {Partial<ISize>} size The new window size
	 * @param {IResizeOptions} [options] Options for resizing
	 */
	resize(size: Partial<ISize>, options?: IResizeOptions): Promise<void>;

	/**
	 * Resize the current window to fit the app content area.
	 *
	 * @author Karelian_na
	 * @date 2026/05/31
	 * @param [options] Options for resizing
	 */
	resizeToFitAppContent(options?: IResizeOptions): Promise<void>;
}
