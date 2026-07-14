/** @format */

import type { Autowired } from "./Autowired";
import type { InstantiationService } from "../services/InistantiationService";

import { DecoratedService, ServiceProvider } from "../services/ServiceProvider";

import "reflect-metadata";

export interface IServiceMetadataInfo {
	servicesToCtors: Map<string, DecoratedService<any>>;
	// maybe multiple constructors map to a service, these constructors are in same proto chains
	ctorsToServices: Map<DecoratedService<any>, string>;
}

/**
 * Registers a class as a service.
 *
 * This decorator is used to register a class as a service to the service provider which name is the camelCase name of the class.
 *
 * The place where it depends should be decorated with {@link Autowired} to inject the service.
 *
 * Note that the dependencies which are decorated with {@link Autowired} of the registered services should be created by
 * {@link InstantiationService.createInstance} can be injected automatically by the service provider. This means that the
 * main application entry point should use the {@link InstantiationService} to create a service instance.
 *
 * some example:
 * ```typescript
 * {@link @Service}
 * class MyService {
 *     dosomething() {
 *     }
 * }
 *
 * {@link @Service}
 * class OtherService {
 *     {@link @Autowired}
 *     myService: MyService;
 *
 *     {@link @Autowired("myService")}
 *     aliasMyService!: MyService;
 * }
 * ```
 */
export function Service<T extends new (...args: any[]) => any>(constructor: T) {
	let servicesMetadataInfo = Reflect.getMetadata("serviceMetadataKey", Service);

	if (!servicesMetadataInfo) {
		servicesMetadataInfo = { servicesToCtors: new Map(), ctorsToServices: new Map() };
	}

	const srvName = ServiceProvider.getDecoratedServiceName(constructor);
	const ctor = servicesMetadataInfo.servicesToCtors.get(srvName);
	if (ctor) {
		if (Object.getPrototypeOf(constructor).prototype !== ctor.prototype) {
			throw new Error(`Service ${constructor.name} is already registered with a different prototype.`);
		}
	}

	servicesMetadataInfo.servicesToCtors.set(srvName, constructor);
	servicesMetadataInfo.ctorsToServices.set(constructor, srvName);
	Reflect.defineMetadata("serviceMetadataKey", servicesMetadataInfo, Service);
}
