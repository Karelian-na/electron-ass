/** @format */

import type { ILogService } from "./LogService";
import type { IService } from "./ServiceProvider";
import type { Optional } from "../../common/utils";
import type { IpcEventsMap } from "../../common/events";
import type { EventHandler, ICommonEventService, IEventsMap } from "../../common/services/IEventService";

import { Service } from "../decorators/Service";
import { Autowired } from "../decorators/Autowired";
import { BrowserWindow, ipcMain, WebContents } from "electron";
import { EventEmitter } from "../../common/services/IEventService";
import { IpcChannelEvents, IpcErrorResult } from "../../common/events";

@Service
export class EventService<IPCEM extends IEventsMap = IpcEventsMap, IEM extends IEventsMap = {}>
	extends EventEmitter<IPCEM, IEM>
	implements IEventService<IPCEM, IEM>
{
	@Autowired
	private readonly logService!: ILogService;

	sendIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(channel: T, ...args: Parameters<IPCEM[T]>): void;
	sendIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(receiver: WebContents, channel: T, ...args: Parameters<IPCEM[T]>): void;
	sendIpcEvent(receiverOrChannel: unknown, channelOrArgs?: unknown, ...args: unknown[]): void {
		this.logService.debug(
			`EventService::sendIpcEvent: send an IpcEvent '${typeof receiverOrChannel !== "string" ? channelOrArgs : receiverOrChannel}'`,
		);
		if (typeof receiverOrChannel !== "string") {
			(receiverOrChannel as WebContents).send(IpcChannelEvents.sendIpcEvent, channelOrArgs as string, ...args);
			return;
		}

		BrowserWindow.getAllWindows().forEach((win) => {
			win.webContents.send(IpcChannelEvents.sendIpcEvent, receiverOrChannel, channelOrArgs, ...args);
		});
	}

	invokeIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(
		receiver: WebContents,
		channel: T,
		...args: Parameters<IPCEM[T]>
	): Promise<Awaited<ReturnType<IPCEM[T]>>[]> {
		this.logService.debug(`EventService::invokeIpcEvent: send an IpcEvent '${String(channel)}'`);
		return new Promise((resolve, reject) => {
			const timestamp = Date.now();
			ipcMain.once(`${String(channel)}:${timestamp}`, (_, res: Array<any>) => {
				if (IpcErrorResult.isIpcError(res)) {
					reject(res.toError());
					return;
				}

				resolve(res);
			});

			receiver.send(IpcChannelEvents.invokeIpcEvent, timestamp, channel, ...args);
		});
	}

	listenChannelWithError(channel: string, fn: Function, argsWithEvent?: boolean) {
		ipcMain.on(channel, (_, ...args) => {
			try {
				const passArgs = [...args];
				if (argsWithEvent) {
					passArgs.unshift(_);
				}
				const res = fn(...passArgs);
				_.returnValue = res;
			} catch (error) {
				this.logService.error(`${channel}: ${(error as Error).message}`);
				_.returnValue = error;
			}
		});
		this.logService.debug(`EventService::listenChannelWithError: 	add a listener '${fn.toString()}' to channel ${channel}!`);
	}

	handleChannelWithError(channel: string, fn: Awaited<Function>, argsWithEvent?: boolean) {
		ipcMain.handle(channel, async (_, ...args) => {
			try {
				if (argsWithEvent) {
					return await fn(_, ...args);
				} else {
					return await fn(...args);
				}
			} catch (error) {
				const err = error as Error;
				this.logService.error(`Error invoke channel ${channel}: ${err.message}`);
				const res = {
					message: err.message,
					stack: err.stack,
				} as any;
				for (const key in err) {
					if (Object.prototype.hasOwnProperty.call(err, key)) {
						const value = (err as any)[key];
						res[key] = value;
					}
				}
				return new Error(JSON.stringify(res));
			}
		});
		this.logService.debug(
			`EventService::handleChannelWithError: 	add a listener '${fn.toString()}' ${
				argsWithEvent ? "with" : "without"
			} sender argument to channel ${channel}!`,
		);
	}

	isSuccessfullyHandlered(ress: any): boolean {
		if (!ress) {
			throw new Error("EventService::isSuccessfullyHandlered: accept an empty result return by sendEvent with no handlers!");
		}

		if (Array.isArray(ress)) {
			return ress.every((res) => !res);
		}
		return !ress;
	}

	getFirstEventResultError(ress: any): Optional<string> {
		if (!ress) {
			return;
		}

		for (let idx = 0; idx < ress.length; idx++) {
			let res = ress[idx];

			if (res) {
				return res;
			}
		}

		return;
	}
}

export interface IEventService<IPCEM extends IEventsMap = IpcEventsMap, IEM extends IEventsMap = {}>
	extends ICommonEventService<IPCEM, IEM>, IService {
	/**
	 * Listen a channel and synchronously to process events sent from the renderer process
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {string} channel the channel string
	 * @param {Function} fn the handler
	 * @param {boolean} argsWithEvent whether to include the IPC event object as the first argument
	 */
	listenChannelWithError(channel: string, fn: Function, argsWithEvent?: boolean): void;

	/**
	 * Handle a channel and asynchronously process events sent from the renderer process
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {string} channel the channel string
	 * @param {Awaited<Function>} fn the handler
	 * @param {boolean} [argsWithEvent] whether to include the IPC event object as the first argument
	 */
	handleChannelWithError(channel: string, fn: Awaited<Function>, argsWithEvent?: boolean): void;

	/**
	 * Send an event to all renderer processes synchronously.
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {T} channel the event channel string to send
	 * @param {...Parameters<IPCEM[T]>} args the arguments
	 */
	sendIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(channel: T, ...args: Parameters<IPCEM[T]>): void;

	/**
	 * Send an event to a specific renderer process synchronously.
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {WebContents} receiver the webcontents of the renderer process
	 * @param {T} channel the event channel string to send
	 * @param {...Parameters<IPCEM[T]>} args the arguments
	 */
	sendIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(receiver: WebContents, channel: T, ...args: Parameters<IPCEM[T]>): void;

	/**
	 * Send an IPC event asynchronously and return a promise.
	 *
	 * @author Karelian_na
	 * @date 2023/12/05
	 * @param {WebContents} receiver the webcontents of the renderer process
	 * @param {T} channel the event channel string to invoke
	 * @param {...Parameters<IPCEM[T]>} args the arguments
	 */
	invokeIpcEvent<T extends keyof Record<keyof IPCEM, EventHandler>>(
		receiver: WebContents,
		channel: T,
		...args: Parameters<IPCEM[T]>
	): Promise<Array<Awaited<ReturnType<IPCEM[T]>>>>;

	/**
	 * Check whether the given event results indicate successful handling.
	 *
	 * @author Karelian_na
	 * @date 2023/12/06
	 * @param {any} ress The event results to check
	 */
	isSuccessfullyHandlered(ress: any): boolean;

	/**
	 * Get the first error from the event results.
	 *
	 * @author Karelian_na
	 * @date 2023/12/06
	 * @param {any} ress The event results to check
	 */
	getFirstEventResultError(ress: any): Optional<string>;
}
