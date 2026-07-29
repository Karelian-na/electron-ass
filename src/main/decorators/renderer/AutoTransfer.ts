/** @format */

import type { Optional } from "../../../common/utils";
import type { AccessorCallWithName } from "../../../common/decorators/AccessorCallWithName";

import { Clazz } from "../../utils/Clazz";
import { EmptyObject } from "../../../common/utils/index";

import "reflect-metadata";

type Invoker = (channel: string, ...args: any[]) => any;

export interface IAutoTransferredClassMetadata {
	domain?: string;
	transferMapInfo?: Map<
		string | Symbol,
		{
			domain?: string;
			invoker?: Invoker;
		}
	>;
}

/**
 * A set of exposed APIs that using by the instance which class is decorated with {@link AutoTransfer}.
 *
 * @author Karelian_na
 * @date 2025/07/04
 * @export
 * @class AutoTransferredAPI
 */
export class AutoTransferredAPI extends Object {
	/**
	 * Get the domain from an object.
	 *
	 * @author Karelian_na
	 * @date 2025/07/04
	 * @param obj The object to get the domain from.
	 * @returns {*} the domain that class decorated with {@link AutoTransfer}
	 */
	static getDomain(obj: Object) {
		const metadata = getAndCreateAutoTransferMetadata(Object.getPrototypeOf(Object.getPrototypeOf(obj)));
		return metadata.domain;
	}

	/**
	 * format a channel from domain and name
	 * @author Karelian_na
	 * @date 2026/05/27
	 * @param domain the domain
	 * @param name the method name or a property name
	 */
	static makeChannel(domain: string, name: string): string {
		return `${domain}::${name}`;
	}

	/**
	 * Get the channel from a method.
	 *
	 * This method retrieves the channel name from a method's metadata, which is defined by the {@link AutoTransfer} decorator.
	 *
	 * Formatted as `domain::methodName`, where `domain` is equal to the result of {@link getDomain} and `methodName` is the name of the method.
	 * @author Karelian_na
	 * @date 2025/07/04
	 * @param obj The object to get the channel from.
	 * @param method The method to get the channel from.
	 * @returns {*} The channel name.
	 */
	static getChannelFromMethod(obj: Object, method: Function): string {
		const originClass = Clazz.getOriginalPrototypeOfDecoratedClass(obj);
		const metadata = getAndCreateAutoTransferMetadata(originClass);

		const methodName = method.name.replace("bound ", "");
		const transferMapInfo = metadata.transferMapInfo?.get(methodName);
		if (!transferMapInfo) {
			throw new Error(`Method ${methodName} is not decorated with @AutoTransfer!`);
		}

		return AutoTransferredAPI.makeChannel(transferMapInfo.domain ?? metadata.domain!, methodName);
	}
}

function getAndCreateAutoTransferMetadata(target: Object) {
	let metadata = Reflect.getOwnMetadata("autoTransferMetadataKey", target);

	if (!metadata) {
		metadata = {};
		Reflect.defineMetadata("autoTransferMetadataKey", metadata, target);
	}

	if (!metadata.transferMapInfo) {
		metadata.transferMapInfo = new Map();
	}
	return metadata;
}

/**
 * For electron-sandbox environment, properties and member methods will not be cloned to the instance when the class is instantiated.
 *
 * This function is used to define the property from the prototype chain to the instance.
 *
 * @param target The target object (instance) to define the property on.
 * @param propertyKey The key of the property to define.
 * @returns
 */
function definePropToInstance(target: Object, propertyKey: string | symbol): void {
	let prototype = target;
	let descriptor: PropertyDescriptor | undefined;

	while (!descriptor) {
		prototype = Object.getPrototypeOf(prototype);
		if (!prototype || prototype === Object.prototype) {
			break;
		}
		descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);
	}

	// if the property is not defined in the prototype chain, we can just return
	if (!descriptor) {
		return;
	}

	if (descriptor.get || descriptor.set) {
		Object.defineProperty(target, propertyKey, {
			get() {
				return descriptor?.get?.call(target);
			},
		});
		return;
	}

	if (typeof descriptor.value === "function") {
		Object.defineProperty(target, propertyKey, {
			enumerable: true,
			configurable: true,
			value: descriptor.value.bind(target),
		});
		return;
	}

	// if the property is not a function, we can just define it as a value
	Object.defineProperty(target, propertyKey, {
		enumerable: true,
		configurable: true,
		value: descriptor.value,
	});
}

/**
 * {@link AutoTransfer} decorator auto transfer class's methods to the main process using a invoker that with the channel
 * of the first argument value as `domain::methodName` and should call {@link Electron.ipcRenderer.invoke} or
 * {@link Electron.ipcRenderer.send} in its implementation.
 *
 * To make it work, you should decorate a class and its methods or properties(auto create with the invoker function).
 *
 * - When decorate a `class`, the domain string will be provided if its properties or methods are decorated with no domain string.
 * - When decorate a `method`, the method will be called directly if it was exposed. you can implement it with no communication with the main process.
 * Or call {@link AutoTransferredAPI.getChannelFromMethod} to get the channel, and then call {@link Electron.ipcRenderer.invoke} or
 * {@link Electron.ipcRenderer.send} with the channel to transfer the data to the main process. `channel` is decided by the domain string if you provide
 * or the class's domain string and the method name. e.g. `domain::methodName`.
 *
 * - When decorate a `property`, the property typed `Function` will be auto created with implementation of calling the invoker function
 * with the channel as the first argument. also the channel is decided by the domain string if you provide or the class's domain string
 * and the property name. e.g. `domain::propertyName`.
 *
 * Note that if you decorate a `property` which should be a getter, you should also decorate it with {@link AccessorCallWithName}.
 *
 * {@link AutoTransfer} should be used with the decorator `ListenChannel` or `HandleChannel` in the main process to handle the transfered calls.
 *
 * Some examples:
 * ```typescript
 * function invoker(channel: string, ...args: any[]) {
 *     ipcRenderer.invoke(channel, ...args);
 * }
 *
 * function accessorInvoker(this: MyClass, name: string) {
 *     const domain = AutoTransferredAPI.getDomain(this);
 *     return AutoTransferredAPI.makeChannel(domain, name);
 * }
 *
 * function staticAccessorInvoker(this: typeof MyClass, name: string) {
 *     const domain = AutoTransferredAPI.getDomain(this.prototype);
 *     return AutoTransferredAPI.makeChannel(domain, name);
 * }
 *
 * {@link @AutoTransfer("myDomain")}
 * class MyClass {
 *     {@link @AutoTransfer}
 *     method(...args: any[]) {
 *         // do something here
 *         const channel = AutoTransferredAPI.getChannelFromMethod(this, this.method);
 *         ipcRenderer.invoke(channel, ...args);
 *     }
 *
 *     {@link @AutoTransfer(invoker)}
 *     propertyMethodWithNoDomain!: Function;
 *
 *     {@link @AutoTransfer("customDomain", invoker)}
 *     propertyMethodWithCustomDomain!: Function;
 *
 *     {@link @AutoTransfer}
 *     {@link @AccessorCallWithName(accessorInvoker)}
 *     getterProperty!: string;
 *
 *
 *     {@link @AutoTransfer}
 *     static staticPropertyMethod(...args: any[]) {
 *         // do something here
 *         const channel = AutoTransferredAPI.getChannelFromMethod(this.prototype, this.staticPropertyMethod);
 *         ipcRenderer.invoke(channel, ...args);
 *     }
 *
 *     {@link @AutoTransfer(invoker)}
 *     static staticPropertyMethodWithNoDomain!: Function;
 *
 *     {@link @AutoTransfer("customDomain", invoker)}
 *     static staticPropertyMethodWithCustomDomain!: Function;
 *
 *     {@link @AutoTransfer}
 *     {@link @AccessorCallWithName(staticAccessorInvoker)}
 *     static staticGetterProperty!: string;
 * }
 * ```
 * @param domain The domain string to use for the channel.
 * @param invoker The invoker function to use for the `property`.
 *
 */
export function AutoTransfer(domain: string): Function; // decorate on a class or method with a domain string
export function AutoTransfer(invoker: Invoker): PropertyDecorator; // decorate on a property with an invoker function
export function AutoTransfer(domain: string, invoker: Invoker): PropertyDecorator; // decorate on a property with a domain string and an invoker function
export function AutoTransfer(target: Object, propertyKey: string | symbol, propertyDescriptor?: PropertyDescriptor): void; // decorate on a static method or property
export function AutoTransfer(target: Clazz.Constructor, propertyKey: string | symbol, propertyDescriptor?: PropertyDescriptor): void; // decorate on a instance method or property
export function AutoTransfer(
	domainOrInvokerOrTarget: string | Function | Object,
	propertyKeyOrInvoker?: Invoker | string | symbol,
	propertyDescriptor?: PropertyDescriptor,
): PropertyDecorator | Function | void {
	// decorate on a instance method or a instance property with no parameters, then add it to the transfer map directly
	// signature:
	//   AutoTransfer(target: Object, propertyKey: string | symbol, propertyDescriptor?: PropertyDescriptor): void; // decorate on a method or a property
	//
	// example:
	//   class Test {
	//     @AutoTransfer
	//     @AccessorCallWithName(function (this: Test, name: string) {
	//       const domain = AutoTransferredAPI.getDomain(this)!;
	//       return AutoTransferredAPI.makeChannel(domain, name);
	//     })
	//     testProperty!: string;
	//
	//     @AutoTransfer
	//     testMethod() {
	//       return AutoTransferredAPI.getChannelFromMethod(this, this.testMethod);
	//     }
	//   }
	//
	if (typeof domainOrInvokerOrTarget === "object") {
		const metadata = getAndCreateAutoTransferMetadata(domainOrInvokerOrTarget);
		metadata.transferMapInfo!.set(propertyKeyOrInvoker as string | symbol, EmptyObject);
		return;
	}

	// decorate on a static method or a instance property with no parameters, then add it to the transfer map directly
	// signature:
	//   AutoTransfer(target: Clazz.Constructor, propertyKey: string | symbol, propertyDescriptor?: PropertyDescriptor): void; // decorate on a method or a property
	//
	// example:
	//   class Test {
	//     @AutoTransfer
	//     @AccessorCallWithName(function (this: typeof Test, name: string) {
	//       const domain = AutoTransferredAPI.getDomain(this.prototype)!;
	//       return AutoTransferredAPI.makeChannel(domain, name);
	//     })
	//     static testProperty: string;
	//
	//     @AutoTransfer
	//     static testMethod() {
	//       return AutoTransferredAPI.getChannelFromMethod(this.prototype, this.testMethod);
	//     }
	//   }
	//
	if (typeof domainOrInvokerOrTarget === "function" && propertyKeyOrInvoker) {
		const metadata = getAndCreateAutoTransferMetadata((domainOrInvokerOrTarget as Clazz.Constructor).prototype);
		metadata.transferMapInfo!.set(propertyKeyOrInvoker as string | symbol, EmptyObject);
		return;
	}

	const invokerFn = typeof domainOrInvokerOrTarget === "function" ? domainOrInvokerOrTarget : (propertyKeyOrInvoker as Optional<Invoker>);

	// decorate on a property with an invoker function and a optional domain string
	// this condition's value is decided by the `invokerFn`
	//
	// signature:
	//   AutoTransfer(invoker: Invoker): PropertyDecorator;
	//   AutoTransfer(domain: string, invoker: Invoker): PropertyDecorator;
	if (invokerFn !== void 0 || typeof domainOrInvokerOrTarget !== "string") {
		return function (
			constructorOrTarget: Clazz.Constructor | Object,
			propertyKey: string | symbol,
			propertyDescriptor?: PropertyDescriptor,
		): void {
			if (propertyDescriptor) {
				throw new Error("@AutoTransfer decorator cannot be used on a method with an invoker function!");
			}

			// decorate on a static property
			// example:
			//   class Test {
			//     @AutoTransfer(ipcRenderer.invoke)
			//     static someStaticProperty!: () => string;
			//   }
			if (typeof constructorOrTarget === "function") {
				let domain = typeof domainOrInvokerOrTarget === "string" ? domainOrInvokerOrTarget : void 0;
				if (!domain) {
					const metadata = getAndCreateAutoTransferMetadata(constructorOrTarget.prototype);
					domain = metadata.domain;
				}

				if (!domain) {
					throw new Error(
						"@AutoTransfer decorator used with a invoker requires a domain string, considering add a domain string or decorate the class with a domain string!",
					);
				}

				Object.defineProperty(constructorOrTarget, propertyKey, {
					enumerable: true,
					configurable: true,
					value: function (this: typeof constructorOrTarget, ...args: any[]) {
						return invokerFn!.apply(this, [domain, ...args]);
					},
				});
				return;
			}

			// decorate on a instance property
			// example:
			//   class Test {
			//     @AutoTransfer(ipcRenderer.invoke)
			//     testProperty!: string;
			//   }
			const metadata = getAndCreateAutoTransferMetadata(constructorOrTarget);
			metadata.transferMapInfo!.set(propertyKey, {
				domain: typeof domainOrInvokerOrTarget === "string" ? domainOrInvokerOrTarget : void 0,
				invoker: invokerFn as Invoker,
			});
		};
	}

	// decorate on a class(or property or method) with a domain string
	//
	// AutoTransfer(domain: string): Function;
	return function (
		constructorOrTarget: Clazz.Constructor | Object,
		propertyKey?: string | symbol,
		propertyDescriptor?: PropertyDescriptor,
	): Function | void {
		// decorate on a instance method or a instance property
		//
		// example:
		//   class Test {
		//     @AutoTransfer("AnotherDomain")
		//     @AccessorCallWithName((this: Test, name: string) => {
		//        const domain = AutoTransferredAPI.getDomain(this);
		//        return AutoTransferredAPI.makeChannel(domain, name);
		//     })
		//     testProperty!: () => string;
		//
		//     @AutoTransfer("AnotherDomain")
		//     testProperty(): string {
		//        return AutoTransferredAPI.getChannelFromMethod(this, this.testProperty);
		//     }
		//   }
		//
		if (typeof constructorOrTarget === "object") {
			const metadata = getAndCreateAutoTransferMetadata(constructorOrTarget);
			metadata.transferMapInfo!.set(propertyKey!, { domain: domainOrInvokerOrTarget });
			return;
		}

		const metadata = getAndCreateAutoTransferMetadata(constructorOrTarget.prototype);

		// decorate on a static method or a static property
		if (propertyKey) {
			// decorate on a static property
			if (!propertyDescriptor) {
				throw new Error("@AutoTransfer decorator cannot be used on a static property with domain string only!");
			}

			// decorate on a static method
			if (typeof propertyDescriptor.value !== "function" && !propertyDescriptor.get) {
				throw new Error("@AutoTransfer decorator cannot be used on a static getter or method without implementation!");
			}
			metadata.transferMapInfo!.set(propertyKey, { domain: domainOrInvokerOrTarget });
			return;
		}

		// decorate on a class
		metadata.domain = domainOrInvokerOrTarget;
		return class extends constructorOrTarget {
			constructor(...args: any[]) {
				super(...args);

				metadata.transferMapInfo?.forEach((info, key) => {
					const strKey = String(key);
					// map to its prototype method if invoker is not provided
					if (!info.invoker) {
						definePropToInstance(this, strKey);
						return;
					}

					const channel = AutoTransferredAPI.makeChannel(info.domain ?? metadata.domain!, strKey);
					Object.defineProperty(this, strKey, {
						enumerable: true,
						configurable: true,
						value: info.invoker.bind(this, channel),
					});
				});
			}
		};
	};
}
