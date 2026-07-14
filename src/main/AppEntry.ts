import type { ElectronApp } from "./ElectronApp";
import type { ILogService } from "./services/LogService";

import { app, dialog } from "electron/main";
import { ServiceCollection } from "./services/ServiceProvider";
import { InstantiationService } from "./services/InistantiationService";

export class AppEntry {
	private static _instance: AppEntry;
	private static _appClass: typeof ElectronApp;

	/**
	 * Get the entry point instance
	 *
	 * @author Karelian_na
	 * @date 2026/06/04
	 */
	public static getInstance() {
		if (!this._instance) {
			this._instance = new AppEntry();
		}
		return this._instance;
	}

	/**
	 * Set the startup class, the entry point will create it, call {@link getAppInstance} to get the instance, note that this function can only been called once
	 *
	 * @author Karelian_na
	 * @date 2026/06/04
	 * @param {typeof ElectronApp} ctor the application class
	 */
	public static setAppClass(ctor: typeof ElectronApp) {
		if (this._appClass) {
			throw new Error("The appClass coundn't been assigned more than once!");
		}
		this._appClass = ctor;
	}

	/**
	 * Get the startup class
	 *
	 * @author Karelian_na
	 * @date 2026/06/04
	 */
	public static getAppClass() {
		return this._appClass;
	}

	private _appInstance!: ElectronApp;
	private _instantiationService!: InstantiationService;

	/**
	 * Create the basic services for the application, including LogService and InstantiationService, and return them in an array.
	 *
	 * @author Karelian_na
	 * @date 2023/08/24 21:02:23
	 */
	private _createServices(): [InstantiationService, ILogService] {
		const services = new ServiceCollection();

		const logService = AppEntry._appClass.createLogService();
		services.set("logService", logService);
		logService.info("");
		logService.info("AppEntry::_createServices: Successfully create instance of logService!");

		this._instantiationService = new InstantiationService(services);
		logService.info("AppEntry::_createServices: Successfully create instance of instantiationService!");

		return [this._instantiationService, logService];
	}

	/**
	 * Startup the application, create the main instance of ElectronApp and call its startup method.
	 *
	 * @author Karelian_na
	 * @date 2023/08/24
	 */
	public startup(): void {
		// return is application already started
		if (this._appInstance) {
			return;
		}

		// check if the application class is set
		if (!AppEntry._appClass) {
			throw new Error(
				"Application class doesn't been specified, considering using `@ElectronApplication` to decorate a class which inherit ElectronApp",
			);
		}

		try {
			// call the beforeCreate method of the application class
			if (!AppEntry._appClass.beforeCreate()) {
				AppEntry._appClass.onInitFailed();
				app.exit();
			}

			const [instantiationService, logService] = this._createServices();
			this._appInstance = instantiationService.createInstance(AppEntry._appClass) as any;
			logService.info("AppEntry::startup: Init application...");
			if (!this._appInstance.initApplication()) {
				logService.error("AppEntry::startup: Application initialization failed!");
				AppEntry._appClass.onInitFailed();
				app.exit();
			}

			logService.info("AppEntry::startup: Starting Electron app...");
			this._appInstance.startup();
		} catch (ex) {
			dialog.showErrorBox("Application Error", `Error occurred when starting the application: ${(ex as Error).message}`);
			app.exit();
		}
	}

	/**
	 * Get the instantiation service instance.
	 *
	 * @author Karelian_na
	 * @date 2026/06/04
	 */
	public getInstantiationService() {
		return this._instantiationService;
	}

	/**
	 * Get the application instance.
	 *
	 * @author Karelian_na
	 * @date 2026/06/04
	 */
	public getAppInstance() {
		return this._appInstance;
	}
}
