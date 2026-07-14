/** @format */

export namespace Clazz {
	export type Constructor<T = any> = new (...args: any[]) => T;

	export function getOriginalClassOfDecoratedClass(ctor: Function): Function;
	export function getOriginalClassOfDecoratedClass(obj: Object): Function;
	export function getOriginalClassOfDecoratedClass(obj: Object | Function): Function {
		let prototype: Object;

		if (typeof obj === "function") {
			prototype = obj.prototype;
		} else {
			prototype = Object.getPrototypeOf(obj) as Object;
		}

		while (!prototype.constructor.name) {
			prototype = Object.getPrototypeOf(prototype) as Object;
			if (prototype === Object.prototype) {
				return Object;
			}
		}
		return prototype.constructor;
	}

	export function getOriginalPrototypeOfDecoratedClass(ctor: Function): Object;
	export function getOriginalPrototypeOfDecoratedClass(obj: Object): Object;
	export function getOriginalPrototypeOfDecoratedClass(obj: Object | Function): Object {
		const originalClass = Clazz.getOriginalClassOfDecoratedClass(obj);
		return originalClass.prototype;
	}
}
