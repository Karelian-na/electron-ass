/** @format */

import type { ILogService } from "./LogService";
import type { Optional } from "../../common/utils";
import type { IService, DecoratedService } from "./ServiceProvider";

import { Service } from "../decorators/Service";
import { ServiceProvider, ServiceCollection } from "./ServiceProvider";

export type DelayServiceCreatedHandler = () => void;

export class InstantiationService implements IInstantiationService {
	private _services!: ServiceCollection;
	private _creatingStack: Array<DecoratedService<any>> = [];
	private _delayServicesMap: Map<IService, Array<string>> = new Map();
	private _delayServiceCreatedHandler: Map<string, Array<DelayServiceCreatedHandler>> = new Map();

	constructor(
		srvs: ServiceCollection = new ServiceCollection(),
		private _parent?: IInstantiationService,
		private readonly logService = srvs.getByKey("logService") as ILogService,
	) {
		if (!this.logService && this._parent) {
			this.logService = this._parent.getServiceInstance("logService")!;
		}

		if (!this.logService) {
			throw new Error("InstantiationService must be created with an instance of LogService!");
		}

		this._services = srvs;
		this._services.set("instantiationService", this);
	}

	_createInstance(srvNameOrCtor: string | (new (...args: any[]) => any)) {
		let instance: Optional<IService>;

		let decoratedSrvCtor: DecoratedService<any>;
		if (!(srvNameOrCtor instanceof Function)) {
			instance = this._services.getByKey(srvNameOrCtor);
			if (instance) {
				return instance;
			}

			const servicesMetadataInfo = Reflect.getMetadata("serviceMetadataKey", Service)!;
			if (!servicesMetadataInfo) {
				throw new Error(`Service ${srvNameOrCtor} is not registered!`);
			}

			decoratedSrvCtor = servicesMetadataInfo.servicesToCtors.get(srvNameOrCtor)!;
			if (!decoratedSrvCtor) {
				throw new Error(`Service ${srvNameOrCtor} is not registered!`);
			}
		} else {
			decoratedSrvCtor = srvNameOrCtor as DecoratedService<any>;
		}

		const srvName = this._getServiceName(srvNameOrCtor);
		const existIdx = this._creatingStack.findIndex((item) => item === decoratedSrvCtor);
		if (existIdx !== -1) {
			let errorMessage = `Detected circular service dependency! Stack was:`;
			let indent = "";
			this._creatingStack.forEach((item, idx) => {
				const name = ServiceProvider.getDecoratedServiceName(item);
				if (idx < existIdx) {
					indent = "  ".repeat(idx);
					errorMessage += `\r\n${indent}${name}`;
					return;
				}

				indent = "  ".repeat(existIdx - 1);
				if (idx === existIdx) {
					errorMessage += `\r\n${indent}┌────┐`;
				}

				errorMessage += `\r\n${indent}|${"  ".repeat(idx - existIdx + 1)}${name}`;
			});

			const leftRepeatCount = this._creatingStack.length - existIdx;
			errorMessage += `\r\n${indent}|${"  ".repeat(leftRepeatCount + 1)}${srvNameOrCtor}`;
			errorMessage += `\r\n${indent}└───${"───".repeat(leftRepeatCount - 1)}───┘`;

			console.error(errorMessage);
			throw new Error(errorMessage);
		}

		const dependencies = ServiceProvider.getServiceDependencies(decoratedSrvCtor);
		this._creatingStack.push(decoratedSrvCtor);

		const delayServices = new Array<string>();
		for (const dep of dependencies) {
			if (dep.delay) {
				delayServices.push(dep.name);
				continue;
			}

			const depService = this._createInstance(dep.name);
			for (const [service, delays] of this._delayServicesMap) {
				const idx = delays.findIndex((name) => name === dep.name);
				if (-1 !== idx) {
					(service as any)[dep.id] = depService;
					delays.splice(idx, 1);
					if (!delays.length) {
						this._delayServicesMap.delete(service);
					}
					continue;
				}
			}

			let handlers: Optional<Array<DelayServiceCreatedHandler>>;
			if ((handlers = this._delayServiceCreatedHandler.get(dep.name))) {
				handlers.forEach((handler) => handler());
				this._delayServiceCreatedHandler.delete(dep.name);
			}
		}

		instance = Reflect.construct(decoratedSrvCtor, []) as IService;
		this._creatingStack.pop();
		dependencies.forEach((dep) => {
			(instance as any)[dep.id] = this._services.getByKey(dep.name);
		});
		this._services.set(srvName, instance);
		this.logService.info(`InstantiationService::createInstance: Successfully create instance of ${srvName}!`);

		const postConstructMethods = Reflect.getMetadata("postConstructMetadataKey", decoratedSrvCtor);
		postConstructMethods?.forEach((method) => method.call(instance));

		if (delayServices.length) {
			this._delayServicesMap.set(instance, delayServices);
		}
		return instance;
	}

	private _getServiceName<T extends new (...args: any[]) => any>(ctorOrName: string | T) {
		if (ctorOrName instanceof Function) {
			const servicesMetadataInfo = Reflect.getMetadata("serviceMetadataKey", Service)!;

			let name = servicesMetadataInfo.ctorsToServices.get(ctorOrName as any);
			if (!name) {
				name = ctorOrName.name;
			}
			return name;
		}

		return ctorOrName;
	}

	createInstance<T>(name: string): T;
	createInstance<T extends new (...args: any[]) => any>(ctor: T): InstanceType<T>;
	createInstance<T extends new (...args: any[]) => any>(ctorOrName: string | T): InstanceType<T> {
		const instance = this._createInstance(ctorOrName);
		while (this._delayServicesMap.size !== 0) {
			const srv = this._delayServicesMap.keys().next().value!;
			const delayServices = this._delayServicesMap.get(srv);
			this._delayServicesMap.delete(srv);
			delayServices?.forEach((name) => {
				(srv as any)[name] = this._createInstance(name);
			});
		}
		return instance as InstanceType<T>;
	}

	getServiceInstance<T>(name: string): Optional<T>;
	getServiceInstance<T extends new (...args: any[]) => any>(ctor: T): Optional<InstanceType<T>>;
	getServiceInstance<T extends new (...args: any[]) => any>(ctorOrName: string | T): Optional<T> {
		const srvName = this._getServiceName(ctorOrName);
		if (!srvName) {
			console.warn(`Service ${srvName} is not registered!`);
			return void 0;
		}

		let service = this._services.getByKey(srvName) as Optional<T>;
		while (!service) {
			if (!this._parent) {
				break;
			}

			service = this._parent.getServiceInstance(ctorOrName as any);
		}

		return service;
	}

	getAndCreateServiceInstance<T>(name: string): Optional<T>;
	getAndCreateServiceInstance<T extends new (...args: any[]) => any>(ctor: T): Optional<InstanceType<T>>;
	getAndCreateServiceInstance<T extends new (...args: any[]) => any>(ctorOrName: string | T): Optional<T> {
		let instance = this.getServiceInstance(ctorOrName as any);
		if (instance) {
			return instance;
		}

		const srvName = this._getServiceName(ctorOrName);
		instance = this.createInstance(ctorOrName as any);
		if (!instance) {
			throw new Error(`Failed to create instance with name ${srvName}!`);
		}

		return instance;
	}

	onceDelayServiceCreated(serviceName: string, handler: DelayServiceCreatedHandler): void {
		let handlers: Optional<Array<DelayServiceCreatedHandler>>;

		if (!(handlers = this._delayServiceCreatedHandler.get(serviceName))) {
			handlers = [];
			this._delayServiceCreatedHandler.set(serviceName, handlers);
		}

		if (!handlers.includes(handler)) {
			handlers.push(handler);
		}
	}
}

export interface IInstantiationService extends IService {
	/**
	 * Create an instance of a service by name, this will find the service in the registry and create an instance of it.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @template T the service type
	 * @param {string} name the service name
	 */
	createInstance<T>(name: string): T;

	/**
	 * Create an instance of a service by its constructor.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @template T the service type
	 * @param {T} ctor the service constructor
	 */
	createInstance<T extends new (...args: any[]) => any>(ctor: T): InstanceType<T>;

	/**
	 * Get an existing instance of a service by name.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @template T the service type
	 * @param {string} name the service name
	 */
	getServiceInstance<T>(name: string): Optional<T>;

	/**
	 * Get an existing instance of a service by its constructor.
	 *
	 * @author Karelian_na
	 * @date 2026/07/14
	 * @template T the service type
	 * @param {T} ctor the service constructor
	 */
	getServiceInstance<T extends new (...args: any[]) => any>(ctor: T): Optional<InstanceType<T>>;

	/**
	 * Get or create an instance of a service by name.
	 *
	 * @author Karelian_na
	 * @date 2023/12/29
	 * @template T the service type
	 * @param {string} name the service name
	 */
	getAndCreateServiceInstance<T>(name: string): T;

	/**
	 * Get or create an instance of a service by constructor
	 *
	 * @author Karelian_na
	 * @date 2026/07/14
	 * @template T the service type
	 * @param {T} ctor the service constructor
	 */
	getAndCreateServiceInstance<T extends new (...args: any[]) => any>(ctor: T): InstanceType<T>;

	/**
	 * Add a handler for when a service is created with a delay.
	 *
	 * @author Karelian_na
	 * @date 2023/12/03
	 * @param {string} serviceName the service name
	 * @param {DelayServiceCreatedHandler} handler the handler
	 */
	onceDelayServiceCreated(serviceName: string, handler: DelayServiceCreatedHandler): void;
}
