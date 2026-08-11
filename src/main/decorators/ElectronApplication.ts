import type { ElectronApp } from "../ElectronApp";

import { AppEntry } from "../AppEntry";
import { Clazz } from "../../common/utils/Clazz";

/**
 * mark a class as the startup class which inherit the base class {@link ElectronApp},
 * the entry point will create the class, and instantiate all its dependencies
 *
 * Some example:
 * ```typescript
 * {@link @ElectronApplication}
 * class MyApp extends ElectronApp {
 * }
 * ```
 * @author Karelian_na
 * @date 2026/06/03
 * @param ctor the class
 */
export function ElectronApplication<T extends ElectronApp>(ctor: Clazz.Constructor<T>) {
	if (AppEntry.getAppClass()) {
		throw new Error("`@ElectronApplication` decorator can only been used only one class");
	}

	AppEntry.setAppClass(ctor as any);
	AppEntry.getInstance().startup();
}
