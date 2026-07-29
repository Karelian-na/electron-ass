import { contextBridge } from "electron";
import { Clazz } from "../../utils/Clazz";

/**
 * Expose a class instance's methods to the specify isolate world
 *
 * This decorate will construct a new instance of the class, and then use `contextBridge.exposeInIsolatedWorld` to
 * expose its properties
 *
 * @author Karelian_na
 * @date 2026/07/29
 * @param {number} wordId the world id
 */
export function Expose(wordId: number): ClassDecorator;

/**
 * Expose a class or instance methods to the renderer process
 *
 * This decorate will construct a new instance of the class, and then use `contextBridge.exposeInMainWorld` to
 * expose its properties
 *
 * @author Karelian_na
 * @date 2026/07/29
 */
export function Expose(target: Clazz.Constructor): void;

export function Expose(targetOrWorldId: Clazz.Constructor | number): void | Function {
	if (typeof targetOrWorldId !== "number") {
		const instance = Reflect.construct(targetOrWorldId, []);
		for (const [name, value] of Object.entries(instance)) {
			contextBridge.exposeInMainWorld(name, value);
		}
		return;
	}

	return function (target: Clazz.Constructor) {
		const instance = Reflect.construct(target, []);
		for (const [name, value] of Object.entries(instance)) {
			contextBridge.exposeInIsolatedWorld(targetOrWorldId, name, value);
		}
		return;
	};
}
