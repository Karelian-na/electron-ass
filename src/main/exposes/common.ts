/** @format */

import type { EventHandler } from "../../common/services/IEventService";

import { ipcRenderer } from "electron";
import { AutoTransfer } from "../decorators/AutoTransfer";
import { IpcEventsMap } from "../../common/events";
import { IpcChannelEvents, IpcErrorResult } from "../../common/events";
import { EventEmitter as BaseEventEmitter } from "../../common/services/IEventService";

@AutoTransfer("")
export class EventEmitter<
	IPCEM extends Record<keyof IPCEM, EventHandler>,
	IEM extends Record<keyof IEM, EventHandler> = {},
> extends BaseEventEmitter<IPCEM, IEM> {
	private static _ipcEventEmitter = (function () {
		const ipcEventEmitter = new BaseEventEmitter<IpcEventsMap, IpcEventsMap>();
		ipcRenderer.on(IpcChannelEvents.sendIpcEvent, (_, channel, ...args) => {
			console.log("Received IPC event:", channel);
			ipcEventEmitter.sendEvent(channel as any, ...(args as any)).catch((reason) => {
				console.error(`Error handling IPC event ${channel}:`, reason);
			});
		});

		ipcRenderer.on(IpcChannelEvents.invokeIpcEvent, async (_, timestamp, channel, ...args) => {
			try {
				console.log("Received IPC event:", channel);
				const res = await ipcEventEmitter.sendEvent(channel as any, ...(args as any));
				ipcRenderer.send(`${channel}:${timestamp}`, res);
			} catch (error) {
				console.error(`Error handling IPC event ${channel}:`, error);
				ipcRenderer.send(`${channel}:${timestamp}`, new IpcErrorResult(error));
			}
		});
		return ipcEventEmitter;
	})();

	protected _isIpcEvent(event: string) {
		return false;
	}

	public static send(channel: string, ...args: any) {
		ipcRenderer.send(channel, ...args);
	}

	public static sendSyncWithError(channel: string, ...args: any) {
		const result = ipcRenderer.sendSync(channel, ...args);
		if (result instanceof Error) {
			throw result;
		}
		return result;
	}

	public static async invokeWithError(channel: string, ...args: any) {
		const result = await ipcRenderer.invoke(channel, ...args);
		if (result instanceof Error) {
			throw JSON.parse(result.message);
		}
		return result;
	}

	override addEventListener<K extends keyof IEM>(channel: K, callback: IEM[K], once?: boolean): void;
	override addEventListener<K extends keyof IPCEM>(channel: K, callback: IPCEM[K], once?: boolean): void;
	@AutoTransfer
	override addEventListener(channel: any, callback: any, once?: boolean): void {
		if (this._isIpcEvent(channel)) {
			EventEmitter._ipcEventEmitter.addEventListener(channel, callback);
		} else {
			super.addEventListener(channel, callback, once);
		}
	}

	@AutoTransfer
	override sendEvent<T extends keyof IEM>(channel: T, ...args: Parameters<IEM[T]>): Promise<Array<any>> {
		return super.sendEvent(channel, ...args);
	}

	@AutoTransfer
	override sendSync<T extends keyof IEM>(channel: T, ...args: Parameters<IEM[T]>) {
		return super.sendSync(channel, ...args);
	}
}
