/** @format */

import type { IServiceCtor, IServiceDependencyDescriptor } from "../services/ServiceProvider";

/**
 * Marks a property as a delayed-loaded dependency.
 *
 * This decorator is used to mark a property that should be loaded lazily.
 *
 * Some example:
 * ```typescript
 * {@link @Service}
 * class FirstService {
 *     {@link @Autowired}
 *     secondService!: SecondService;
 * }
 *
 * {@link @Service}
 * class SecondService {
 *     {@link @DelayLoad}
 *     {@link @Autowired}
 *     firstService!: FirstService;
 * }
 * ```
 * @param target The target object.
 * @param propertyKey The property key.
 */
export function DelayLoad(target: Object, propertyKey: string | symbol) {
	const srvCtor = target as IServiceCtor<any>;

	const depId = String(propertyKey);
	if (!srvCtor.dependencies) {
		srvCtor.dependencies = [];
	}

	let dep = srvCtor.dependencies.find((item) => item.id === depId);
	if (!dep) {
		dep = {
			id: depId,
		} as Partial<IServiceDependencyDescriptor> as any;

		srvCtor.dependencies.push(dep!);
	}

	dep!.delay = true;
}
