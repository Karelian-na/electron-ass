/** @format */

import type { Clazz } from "../utils/Clazz";

import { AppEntry } from "../AppEntry";
import { PostConstruct } from "./PostConstruct";
import { EventService } from "../services/EventService";

import "reflect-metadata";

interface IChannelHandlerInfo {
	type: "listen" | "handle";
	channel: string;
	handler: Function;
	argsWithEvent?: boolean;
}

export interface IChannelHandlerMetadata {
	domain?: string;
	handlers?: Array<IChannelHandlerInfo>;
}

/**
 * Mark a class as a channel handler provider.
 * 
 * When a class is decorated with this, it will automatically register its methods which decorated with 
 * {@link ListenChannel} or {@link HandleChannel}.as a ipc handler after the class is instantiated.
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @param domain the domain name for the channel handler
 */
export function ChannelHandlerProvider(domain: string) {
	return function (constructor: Clazz.Constructor) {
		let metadata = Reflect.getMetadata("channelHandlerMetadataKey", constructor.prototype);
		if (metadata?.domain) {
			return;
		}

		if (!metadata) {
			metadata = {};
			Reflect.defineMetadata("channelHandlerMetadataKey", metadata, constructor.prototype);
		}
		metadata.domain = domain;

		Reflect.decorate(Array.of(PostConstruct), constructor.prototype, "__channelHandlerProviderPostConstruct", {
			value: function () {
				const eventService = AppEntry.getInstance().getInstantiationService().getAndCreateServiceInstance(EventService)!;

				const metadata = Reflect.getMetadata("channelHandlerMetadataKey", constructor.prototype)!;
				const handlers = new Map<string, { channel: string; info: IChannelHandlerInfo }>();
				metadata.handlers?.forEach((info) => {
					const channel = info.channel.includes("::") ? info.channel : `${metadata.domain}::${info.channel}`;
					// A decorated override replaces the inherited handler for the same IPC channel.
					handlers.set(`${info.type}:${channel}`, { channel, info });
				});

				handlers.forEach(({ channel, info }) => {
					const fn = info.handler.bind(this);
					fn.toString = () => info.handler.toString();
					if (info.type === "listen") {
						eventService.listenChannelWithError(channel, fn, info.argsWithEvent);
					} else if (info.type === "handle") {
						eventService.handleChannelWithError(channel, fn, info.argsWithEvent);
					}
				});
			},
		});
	};
}

function applyChannelListenerDecorator(
	type: IChannelHandlerInfo["type"],
	channelOrTarget?: boolean | string | Object,
	propertyKeyOrArgsWithEvent?: boolean | string,
	descriptor?: PropertyDescriptor,
) {
	const decorator: MethodDecorator = function (target, propertyKey, descriptor) {
		const decorateTarget = (target as any)[propertyKey];
		if (!(decorateTarget instanceof Function)) {
			throw new Error("@ListenChannel Or @HandleChannel decorator can only be used to decorate a member method!");
		}
		decorateTarget.toString = () => `${target.constructor.name}.${String(propertyKey)}`;

		const channel = typeof channelOrTarget === "string" ? channelOrTarget : String(propertyKey);
		const argsWithEvent =
			typeof channelOrTarget === "boolean"
				? channelOrTarget
				: typeof propertyKeyOrArgsWithEvent === "boolean"
					? propertyKeyOrArgsWithEvent
					: false;

		let metadata = Reflect.getMetadata("channelHandlerMetadataKey", target);
		if (!metadata) {
			metadata = {};
			Reflect.defineMetadata("channelHandlerMetadataKey", metadata, target);
		}

		if (!metadata.handlers) {
			metadata.handlers = [];
		}

		metadata.handlers.push({ type, channel, handler: decorateTarget, argsWithEvent });
	};

	if (channelOrTarget && channelOrTarget instanceof Object) {
		decorator(channelOrTarget, (propertyKeyOrArgsWithEvent as string)!, descriptor!);
		return;
	}

	return decorator;
}

/**
 * Register the decorated method as a handler of a synchronous IPC event with channel `domain:methodName` while domain is provided by {@link ChannelHandlerProvider}.
 * of curse, if you provide a custom channel name, it will be used instead of the default `methodName` if channel does not include `::`, otherwise instead of the whole `domain:methodName`.
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @param [argsWithEvent] whether the event object should be passed as the first argument to the method
 * @param [channel] the optional channel name
 */
export function ListenChannel(argsWithEvent?: boolean): MethodDecorator;
export function ListenChannel(channel?: string, argsWithEvent?: boolean): MethodDecorator;
export function ListenChannel(target: Object, propertyKey: string, descriptor: PropertyDescriptor): void;
export function ListenChannel(
	channelOrTarget?: boolean | string | Object,
	propertyKeyOrArgsWithEvent?: boolean | string,
	descriptor?: PropertyDescriptor,
): MethodDecorator | void {
	return applyChannelListenerDecorator("listen", channelOrTarget, propertyKeyOrArgsWithEvent, descriptor);
}

/**
 * Register the decorated method as a handler of a asynchronous IPC event with channel `domain:methodName` while domain is provided by {@link ChannelHandlerProvider}.
 * of curse, if you provide a custom channel name, it will be used instead of the default `methodName` if channel does not include `::`, otherwise instead of the whole `domain:methodName`.
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @param [argsWithEvent] whether the event object should be passed as the first argument to the method
 * @param [channel] the optional channel name
 */
export function HandleChannel(argsWithEvent?: boolean): MethodDecorator;
export function HandleChannel(channel?: string, argsWithEvent?: boolean): MethodDecorator;
export function HandleChannel(target: Object, propertyKey: string, descriptor: PropertyDescriptor): void;
export function HandleChannel(
	channelOrTarget?: boolean | string | Object,
	propertyKeyOrArgsWithEvent?: boolean | string,
	descriptor?: PropertyDescriptor,
): MethodDecorator | void {
	return applyChannelListenerDecorator("handle", channelOrTarget, propertyKeyOrArgsWithEvent, descriptor);
}

/**
 * register a custom ipc handler, call this if you don't use default decorator {@link ListenChannel} or {@link HandleChannel}
 *
 * Some example:
 * ```typescript
 * function customAutoTransferListenChannel(channel?: string): PropertyDecorator {
 * 	return function (target, propertyKey) {
 * 		applyAutoTransferChannelListenerDecorator(
 * 			"listen",
 * 			target,
 * 			propertyKey,
 * 			function (...args: any[]) {
 * 				return (this as any)![propertyKey](...args);
 * 			},
 * 			channel
 * 		);
 * 	};
 * };
 * ```
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @export
 * @param type handler type
 * @param target the target object
 * @param propertyKey the property key
 * @param invoker the function or object that invokes the method, if is an object or a function has a property named propertyKey (static member function), its method will be called
 * if is a function, the function itself will be called, note that the function shouldn't be bound, and it will be called with the instance as `this`
 * @param [channel] the optional channel name
 */
export function applyAutoTransferChannelListenerDecorator(
	type: IChannelHandlerInfo["type"],
	target: Object,
	propertyKey: string | symbol,
	invoker: Function | Object,
	channel?: string,
) {
	let targetInvoker: Function;
	// an invoker
	if (invoker instanceof Function && !Object.hasOwn(invoker, propertyKey)) {
		targetInvoker = invoker;
		targetInvoker.toString = () => invoker.name ? invoker.name : "[Function]";
	}
	// an object that has method which named `propertyKey`
	else {
		if (!((invoker as any)[propertyKey] instanceof Function)) {
			throw new Error(
				"Invalid invoker or target for `@AutoTransferChannelListener` or `@AutoTransferHandleChannel` decorator, expected a function or an object which has the method named " +
					String(propertyKey),
			);
		}
		targetInvoker = function (...args: any[]) {
			return (invoker as any)[propertyKey](...args);
		};
		if (invoker instanceof Function) {
			targetInvoker.toString = () => `${invoker.name}.${String(propertyKey)}`;
		} else if (invoker.constructor === Object){
			targetInvoker.toString = () => `[Object].${String(propertyKey)}`;
		} else {
			targetInvoker.toString = () => `${invoker.constructor.name}.${String(propertyKey)}`;
		}
	}

	Object.defineProperty(target, propertyKey, {
		value: targetInvoker,
		writable: false,
		configurable: true,
		enumerable: false,
	});
	let metadata = Reflect.getMetadata("channelHandlerMetadataKey", target);
	if (!metadata) {
		metadata = {};
		Reflect.defineMetadata("channelHandlerMetadataKey", metadata, target);
	}

	if (!metadata.handlers) {
		metadata.handlers = [];
	}

	metadata.handlers.push({ type, channel: channel ?? String(propertyKey), handler: targetInvoker, argsWithEvent: false });
}

/**
 * Auto transfer an ipc event to specified object which has a method named decorated property or to a function synchronously, used with {@link ChannelHandlerProvider} decorator.
 *
 * This decorator will define a method on the prototype of the class to which the currently decorated property belongs, that calls the given
 * function or a function of the object containing the name of current property. the method will be called when the main process received an
 * ipc event with channel `domain::propertyKey` while the domain provided by {@link ChannelHandlerProvider}
 *
 * Some example:
 * ```typescript
 * class Test {
 * 	public static testStaticMethod() {
 * 		return "testStaticMethod";
 * 	}
 *
 * 	public testMethod() {
 * 		return "testMethod";
 * 	}
 * }
 * const testValue = new Test();
 *
 * {@link @ChannelHandlerProvider("domain")}
 * class TestService {
 * 	{@link @AutoTransferListenChannel(Test)}
 * 	declare method1: (typeof Test)["testStaticMethod"];
 *
 * 	{@link @AutoTransferListenChannel(testValue.testMethod.bind(testValue))}
 * 	declare method2: Test["testMethod"];
 * }
 *
 * ```
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @param target the target object which has the method named decorated property
 * @param invoker the invoker
 * @param [channel] the channel, default use the property key as the channel if not provide
 */
export function AutoTransferListenChannel(target: Object, channel?: string): PropertyDecorator;
export function AutoTransferListenChannel(invoker: Function, channel?: string): PropertyDecorator;
export function AutoTransferListenChannel(invokerOrTarget: Function | Object, channel?: string): PropertyDecorator {
	return function (target, propertyKey) {
		applyAutoTransferChannelListenerDecorator("listen", target, propertyKey, invokerOrTarget, channel);
	};
}

/**
 * Auto transfer an ipc event to specified object which has a method named decorated property or to a function asynchronously, used with {@link ChannelHandlerProvider} decorator.
 *
 * This decorator will define a method on the prototype of the class to which the currently decorated property belongs, that calls the given
 * function or a function of the object containing the name of current property. the method will be called when the main process received an
 * ipc event with channel `domain::propertyKey` while the domain provided by {@link ChannelHandlerProvider}
 *
 * Some example:
 * ```typescript
 * class Test {
 * 	public static testStaticMethod() {
 * 		return "testStaticMethod";
 * 	}
 *
 * 	public testMethod() {
 * 		return "testMethod";
 * 	}
 * }
 * const testValue = new Test();
 *
 * {@link @ChannelHandlerProvider("domain")}
 * class TestService {
 * 	{@link @AutoTransferHandleChannel(Test)}
 * 	declare method1: (typeof Test)["testStaticMethod"];
 *
 * 	{@link @AutoTransferHandleChannel(testValue.testMethod.bind(testValue))}
 * 	declare method2: Test["testMethod"];
 * }
 *
 * ```
 *
 * @author Karelian_na
 * @date 2026/06/08
 * @param target the target object which has the method named decorated property
 * @param invoker the invoker
 * @param [channel] the channel, default use the property key as the channel if not provide
 */
export function AutoTransferHandleChannel(target: Object, channel?: string): PropertyDecorator;
export function AutoTransferHandleChannel(invoker: Function, channel?: string): PropertyDecorator;
export function AutoTransferHandleChannel(invokerOrTarget: Function | Object, channel?: string): PropertyDecorator {
	return function (target, propertyKey) {
		applyAutoTransferChannelListenerDecorator("handle", target, propertyKey, invokerOrTarget, channel);
	};
}
