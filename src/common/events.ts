import { WinIpcEventsMap } from "./services/IWindowManageService";

export enum IpcEvents {
	windowBeforeClose = "WindowService::onBeforeClose",
	windowFocus = "WindowService::onFocus",
	windowBlur = "WindowService::onBlur",
	onMessageTip = "WindowService::onMessageTip",
}

export enum IpcChannelEvents {
	sendIpcEvent = "EventService::sendIpcEvent",
	invokeIpcEvent = "EventService::invokeIpcEvent",
}

export type IpcEventsMap = WinIpcEventsMap;

export class IpcErrorResult {
	private _structureCloneString: string;

	constructor(error: any) {
		if (error instanceof Error) {
			const err = {
				name: error.name,
				message: error.message,
				stack: error.stack,
			} as Error & { cause?: string };

			if ((error as any)["cause"]) {
				err.cause = (error as any)["cause"];
			}
			this._structureCloneString = JSON.stringify(err);
		}

		this._structureCloneString = JSON.stringify({
			name: "IpcError",
			code: "IPC_ERROR",
			message: error,
		} as Error);
	}

	toError(): Error {
		try {
			return JSON.parse(this._structureCloneString) as Error;
		} catch (e) {
			return new Error("Failed to parse error from IPC: " + e);
		}
	}
}
