/** @format */

export type EventHandler = ((...args: any[]) => any) & { once?: boolean };

export type IEventsMap = Record<string, EventHandler>;

export class EventEmitter<IPCEM extends IEventsMap, IEM extends IEventsMap> implements ICommonEventService<IPCEM, IEM> {
	private readonly _eventMap: Map<keyof IPCEM | keyof IEM, Array<EventHandler>> = new Map();

	addEventListener<T extends keyof IPCEM>(channel: T, callback: IPCEM[T], once?: boolean): void;
	addEventListener<T extends keyof IEM>(channel: T, callback: IEM[T], once?: boolean): void;
	addEventListener(channel: keyof IPCEM | keyof IEM, callback: EventHandler, once?: boolean): void {
		let callbacks = this._eventMap.get(channel);
		if (!callbacks) {
			callbacks = [];
			this._eventMap.set(channel, callbacks);
		}

		if (!callbacks.includes(callback)) {
			callback.once = once;
			callbacks.push(callback);
		}
	}

	async sendEvent<T extends keyof IEM>(channel: T, ...args: Parameters<IEM[T]>): Promise<Array<any>> {
		const res = [];
		let callbacks = this._eventMap.get(channel);
		if (callbacks) {
			for (let idx = 0; idx < callbacks.length; ) {
				const callback = callbacks[idx];
				res.push(await callback(...args));
				if (callback.once) {
					callbacks.splice(idx, 1);
				} else {
					++idx;
				}
			}
		}

		return res;
	}

	sendSync<T extends keyof IEM>(channel: T, ...args: Parameters<IEM[T]>): Array<any> {
		let callbacks = this._eventMap.get(channel);
		if (!callbacks) {
			console.log(`EventService::sendSync: send to unregistered event channel: ${String(channel)}!`);
			return [];
		}

		if (callbacks.some((fn) => (fn as any)[Symbol.toStringTag] === "AsyncFunction")) {
			throw new Error(`Cann't sendSync event with channel ${String(channel)}!`);
		}

		const res = new Array();
		for (let idx = 0; idx < callbacks.length; ) {
			const callback = callbacks[idx];
			res.push(callback(...args) as any);
			if (callback.once) {
				callbacks.splice(idx, 1);
			} else {
				++idx;
			}
		}
		return res;
	}

	removeEventListener<T extends keyof IPCEM>(channel: T, callback: IPCEM[T], once?: boolean): void;
	removeEventListener<T extends keyof IEM>(channel: T, callback: IEM[T], once?: boolean): void;
	removeEventListener(channel: keyof IPCEM | keyof IEM, callback: EventHandler, once?: boolean): void {
		let callbacks = this._eventMap.get(channel);
		if (callbacks) {
			if (callback) {
				const index = callbacks.indexOf(callback);
				if (index !== -1) {
					callbacks.splice(index, 1);
				}
			} else {
				this._eventMap.delete(channel);
			}
		}
	}
}

/**
 * Common service interface, can be used in main process or renderer process.
 *
 * @author Karelian_na
 * @date 2026/07/14
 * @template IPCEM IPC events map, provide the type information for IPC events
 * @template IEM Regular events map that in main process, provide the type information for regular events
 */
export interface ICommonEventService<IPCEM extends IEventsMap, IEM extends IEventsMap = {}> {
	/**
	 * Add a registered event for the specified channel, which will be triggered by sendEvent.
	 *
	 * @author Karelian_na
	 * @date 2023/08/09
	 * @param {string} channel The name of the event to listen for
	 * @param {Function} callback The callback to be invoked when the event is triggered
	 * @param {boolean} [once] Whether the event should be triggered only once, which will cause the callback to be removed after being called once
	 */
	addEventListener<T extends keyof Record<keyof IPCEM, EventHandler>>(channel: T, callback: IPCEM[T], once?: boolean): void;

	/**
	 * Add a registered event for the specified channel, which will be triggered by sendEvent.
	 *
	 * @author Karelian_na
	 * @date 2023/08/09
	 * @param {string} channel The name of the event to listen for
	 * @param {Function} callback The callback to be invoked when the event is triggered
	 * @param {boolean} [once] Whether the event should be triggered only once, which will cause the callback to be removed after being called once
	 */
	addEventListener<T extends keyof Record<keyof IEM, EventHandler>>(channel: T, callback: IEM[T], once?: boolean): void;

	/**
	 * Send an event to the specified channel asynchronously.
	 *
	 * @author Karelian_na
	 * @date 2023/08/10
	 * @param {string} channel The name of the event channel to send
	 * @param {...Array<any>} args The arguments to be sent with the event, which will be passed to the registered event callback
	 * @return {Promise<Array<any>>} An array of return values of the registered event callback, which will be resolved when all the registered event callbacks are executed
	 */
	sendEvent<T extends keyof Record<keyof IEM, EventHandler>>(channel: T, ...args: Parameters<IEM[T]>): Promise<Array<any>>;

	/**
	 * Send an event to the specified channel synchronously.
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {string} channel The name of the event channel to send
	 * @param {...Parameters<IEM[T]>} args The arguments to be sent with the event, which will be passed to the registered event callback
	 * @returns {Array<any>} An array of return values of the registered event callback
	 */
	sendSync<T extends keyof Record<keyof IEM, EventHandler>>(channel: T, ...args: Parameters<IEM[T]>): Array<any>;

	/**
	 * Remove a IPC event listener
	 * @author Karelian_na
	 * @date 2026/06/15
	 * @param channel the channel
	 * @param [callback] the listener, if passed, only remove that listener, otherwise, remove all listeners
	 */
	removeEventListener<T extends keyof Record<keyof IPCEM, EventHandler>>(channel: T, callback?: IPCEM[T]): void;

	/**
	 * Remove an event listener
	 * @author Karelian_na
	 * @date 2026/06/15
	 * @param channel the channel
	 * @param [callback] the listener, if passed, only remove that listener, otherwise, remove all listeners
	 */
	removeEventListener<T extends keyof Record<keyof IEM, EventHandler>>(channel: T, callback?: IEM[T]): void;
}

export const EventServiceDomain = "EventService";
