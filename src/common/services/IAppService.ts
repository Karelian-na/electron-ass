/** @format */

import type { app } from "electron/main";

export type SpecialPathName = Parameters<(typeof app)["getPath"]>[0];

/**
 * Common App Service interface, it will be implemented in main process and exposed to renderer process
 * through contextBridge, it contains the methods that are safe to be called in renderer process.
 *
 * @author Karelian_na
 * @date 2023/08/05
 */
export interface ICommonAppService {
	/**
	 * Get the path of a special directory, such as "home", "appData", "userData", etc.
	 *
	 * @author Karelian_na
	 * @date 2023/08/12
	 * @param {SpecialPathName} name The name of the special path
	 */
	getPath(name: SpecialPathName): string;

	/**
	 * Get the current running directory of the application.
	 *
	 * @author Karelian_na
	 * @date 2023/07/29
	 */
	getAppPath(): string;

	/**
	 * Get the current application version.
	 *
	 * @author Karelian_na
	 * @date 2023/09/24
	 */
	getVersion(): string;

	/**
	 * Get the current application name.
	 *
	 * @author Karelian_na
	 * @date 2023/12/07
	 */
	getName(): string;
}

export const AppServiceDomain = "AppService";
