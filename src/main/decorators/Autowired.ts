/** @format */

import type { Service } from "./Service";
import type { IServiceCtor, IServiceDependencyDescriptor } from "../services/ServiceProvider";

/**
 * Autowires a dependency into the target property.
 *
 * This decorator is used to automatically inject a service dependency, the target dependent class must
 * be decorated with {@link Service} to be registered in the service provider.
 *
 * If name is provided, it will be used to resolve the dependency by name.
 *
 * If name isn't provided, the name of the property will be used as the dependency name.
 *
 * Some example:
 * ```typescript
 * {@link @Service}
 * class MyService {
 *     dosomething() {
 *     }
 * }
 *
 * class ServiceAutoInject {
 *     {@link @Autowired}
 *     myService: MyService;
 *
 *     {@link @Autowired("myService")}
 *     aliasMyService!: MyService;
 * }
 * ```
 *
 * @param name The name of the dependency to inject.
 */
export function Autowired(name?: string): PropertyDecorator;
export function Autowired(target: Object, propertyKey: string | symbol): void;
export function Autowired(nameOrTarget?: string | Object, propertyKey?: string | symbol): void | PropertyDecorator {
	const targetName = typeof nameOrTarget === "string" ? nameOrTarget : String(propertyKey);

	const decorator: PropertyDecorator = (target, propertyKey) => {
		const srvCtor = target as IServiceCtor<any>;

		if (!srvCtor.dependencies) {
			srvCtor.dependencies = [];
		}

		const depId = String(propertyKey);
		let dep = srvCtor.dependencies.find((item) => item.id === depId);
		if (!dep) {
			dep = {
				id: depId,
			} as Partial<IServiceDependencyDescriptor> as any;

			srvCtor.dependencies.push(dep!);
		}

		dep!.name = targetName;
	};

	if (nameOrTarget instanceof Object) {
		decorator(nameOrTarget, propertyKey!);
		return;
	}

	return decorator;
}
