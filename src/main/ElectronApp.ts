/** @format */

import type { ILogService, IInstantiationService, IWindowManageService } from "./services";

import { dialog } from "electron/main";
import { Autowired } from "./decorators";
import { MainLogService } from "./services";

import "./services";

export class ElectronApp {
	/**
	 * Callback before the app class is instantiated.
	 *
	 * The devived class can override this method to perform application initialization tasks.
	 *
	 * @author Karelian_na
	 * @date 2026/07/14
	 */
	public static beforeCreate(): boolean {
		return true;
	}

	/**
	 * Implementation of create the main log service, which will be passed to construct {@link instantiationService}
	 *
	 * The devived class can override this method to provide a custom log service implementation.
	 *
	 * @author Karelian_na
	 * @date 2026/07/14
	 */
	public static createLogService(): ILogService {
		return new MainLogService();
	}

	/**
	 * Initialization failure callback
	 *
	 * When {@link beforeCreate} returns false or {@link initApplication} returns false, this method will be called.
	 * The application will quit immediatly after the method is executed.
	 *
	 * @author Karelian_na
	 * @date 2026/07/14
	 */
	public static onInitFailed() {
		dialog.showErrorBox("Application Error", "Application initialization failed!");
	}

	@Autowired
	protected readonly windowManageService!: IWindowManageService;
	@Autowired
	protected readonly instantiationService!: IInstantiationService;

	/**
	 * Initialize the application.
	 *
	 * This method will be called before the main window is shown, and can be used to perform some necessary
	 * initialization work for the application, such as loading configuration files, etc.
	 *
	 * Return true if successfully initialized, otherwise false and {@link onInitFailed} will be called.
	 *
	 * @author Karelian_na
	 * @date 2026/03/16
	 */
	public initApplication(): boolean {
		return true;
	}

	/**
	 * Start the main application.
	 *
	 * This method will be called after the application is initialized, and can be used to perform some necessary work
	 * for starting the application, such as creating the main window, showing the main window, etc.
	 *
	 * @author Karelian_na
	 * @date 2023/08/24
	 */
	async startup(): Promise<void> {
		this.windowManageService.createMainWindow();
	}
}
