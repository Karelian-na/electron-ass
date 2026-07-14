/** @format */

/**
 * `AccessorCallWithName` is a decorator that modifies a method to call an invoker function with the method's name and its arguments.
 * or defines a property that invokes the invoker function with the property key and arguments.
 *
 * this decorator can decrease the chance of name conflicts in the codebase by providing a consistent way to invoke methods with their names.
 *
 * Some example:
 * ```typescript
 * function accessorWithNameInvoker(this: Example, name: string): string {
 *     return name;
 * }
 *
 * class Example {
 *     {@link @AccessorCallWithName(accessorWithNameInvoker)}
 *     myGetter!: string;
 * }
 * ```
 *
 * @author Karelian_na
 * @date 2025/07/04
 * @param invoker The function to invoke with the property key.
 */
export function AccessorCallWithName(invoker: Function): PropertyDecorator {
	return function (target: Object, propertyKey: string | symbol) {
		if (!invoker) {
			throw new Error("@AccessorCallWithName decorator should be used with an invoker function!");
		}

		if (Object.getOwnPropertyDescriptor(target, propertyKey)) {
			throw new Error(`@AccessorCallWithName decorator cannot be used on a property that already has a getter/setter defined.`);
		}

		Object.defineProperty(target, propertyKey, {
			get: function () {
				return invoker.call(this, propertyKey);
			},
		});
	};
}
