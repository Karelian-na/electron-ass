/** @format */

import type { Autowired } from "./Autowired";
import type { InstantiationService } from "../services/InistantiationService";

/**
 * Marks a method as a post-construct method.
 *
 * This decorator is used to mark a method that should be called after the service is constructed.
 *
 * Also as {@link Autowired} which is used to inject dependencies, the post-construct method only be called when
 * the instance of the class was created by {@link InstantiationService}.
 *
 * Some example:
 * ```typescript
 * {@link @Service}
 * class MyService {
 *     {@link @PostConstruct}
 *     initialize() {
 *         console.log("Service initialized");
 *     }
 * }
 * ```
 */
export function PostConstruct(target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
	const method = descriptor.value;
	if (typeof method !== "function") {
		throw new Error("@PostConstruct can only be used on methods.");
	}

	const ctor = target.constructor;
	let postConstructMethods = Reflect.getMetadata("postConstructMetadataKey", ctor);
	if (!postConstructMethods) {
		postConstructMethods = [];
	}

	postConstructMethods.push(method);
	Reflect.defineMetadata("postConstructMetadataKey", postConstructMethods, ctor);
}
