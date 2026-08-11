/** @format */

import { Clazz } from "../../common/utils/Clazz";
import { BiMap } from "../../common/utils/BiMap";

export interface IService {}

/**
 * Constructor of service class.
 *
 * @author Karelian_na
 * @date 2023/08/05
 * @template T the service type
 */
export interface IServiceCtor<T> {
	new (...args: Array<any>): T extends IService ? T : never;
	dependencies?: Array<IServiceDependencyDescriptor>;
}

/**
 * Constructor of service class with decorated parameters
 *
 * @author Karelian_na
 * @date 2023/08/05
 * @template T the service type
 */
export interface DecoratedService<T> {
	new (...args: Array<any>): T extends IService ? T : never;
	prototype: IServiceCtor<T>;
}

/**
 * Dependency descriptor for service class.
 *
 * @author Karelian_na
 * @date 2023/08/05
 */
export interface IServiceDependencyDescriptor {
	id: string;
	name: string;
	delay?: boolean;
}

export class ServiceCollection extends BiMap<string, IService> {}

export class ServiceProvider {
	static getServiceDependencies<T>(ctor: DecoratedService<T>): Array<IServiceDependencyDescriptor> {
		if (ctor.prototype.dependencies) {
			return Array.from(ctor.prototype.dependencies.values());
		}
		return [];
	}

	static getDecoratedServiceName(ctor: Function): string {
		const clazz = Clazz.getOriginalClassOfDecoratedClass(ctor);

		let name = clazz.name;
		if (name.length) {
			name = name[0].toLowerCase() + name.substring(1);
		}
		return name;
	}
}
