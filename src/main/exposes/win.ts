import type { IWindowAPI } from "../../common/interfaces/IWindowAPI";
import type { IResizeOptions, ISize, WinIpcEventsMap } from "../../common/services/IWindowManageService";

import { EventEmitter } from "./common";
import { IpcEvents } from "../../common/events";
import { AutoTransfer } from "../decorators/AutoTransfer";
import { WindowManageServiceDomain } from "../../common/services/IWindowManageService";

@AutoTransfer(WindowManageServiceDomain)
export class WindowAPI extends EventEmitter<WinIpcEventsMap> implements IWindowAPI {
	protected override _isIpcEvent(event: string): boolean {
		return Object.values(IpcEvents).includes(event as any);
	}

	protected _getContentElement() {
		return document.body;
	}

	protected _getAppElement() {
		return this._getContentElement().parentElement! ?? document.body;
	}

	// WindowManage Service
	@AutoTransfer(EventEmitter.invokeWithError)
	openPath!: IWindowAPI["openPath"];

	@AutoTransfer(EventEmitter.send)
	openExternal!: IWindowAPI["openExternal"];

	@AutoTransfer(EventEmitter.send)
	close!: IWindowAPI["close"];

	@AutoTransfer(EventEmitter.invokeWithError)
	resize!: IWindowAPI["resize"];

	@AutoTransfer(EventEmitter.invokeWithError)
	showOpenDialog!: IWindowAPI["showOpenDialog"];

	@AutoTransfer(EventEmitter.send)
	sticky!: IWindowAPI["sticky"];

	resizeToFitAppContent = async (options?: IResizeOptions): Promise<void> => {
		const contentElement = this._getContentElement();
		const appElement = this._getAppElement();
		const appRect = appElement.getBoundingClientRect();
		const contentRect = contentElement.getBoundingClientRect();
		const appStyle = getComputedStyle(appElement);
		const contentStyle = getComputedStyle(contentElement);
		const paddingLeft = parseFloat(contentStyle.paddingLeft) || 0;
		const paddingRight = parseFloat(contentStyle.paddingRight) || 0;
		const paddingTop = parseFloat(contentStyle.paddingTop) || 0;
		const paddingBottom = parseFloat(contentStyle.paddingBottom) || 0;
		const marginRight = parseFloat(contentStyle.marginRight) || 0;
		const marginBottom = parseFloat(contentStyle.marginBottom) || 0;
		const borderRight = parseFloat(appStyle.borderRightWidth) || 0;
		const borderBottom = parseFloat(appStyle.borderBottomWidth) || 0;
		const contentChildren = Array.from(contentElement.children) as HTMLElement[];
		const childrenWidth = contentChildren.reduce((width, child) => {
			const childRect = child.getBoundingClientRect();
			const childRight = childRect.right - contentRect.left;
			return Math.max(width, childRight + paddingRight);
		}, paddingLeft + paddingRight);
		const childrenHeight = contentChildren.reduce((height, child) => {
			const childRect = child.getBoundingClientRect();
			const childBottom = childRect.bottom - contentRect.top;
			return Math.max(height, childBottom + paddingBottom);
		}, paddingTop + paddingBottom);
		const contentWidth = contentChildren.length ? childrenWidth : contentElement.scrollWidth;
		const contentHeight = contentChildren.length ? childrenHeight : contentElement.scrollHeight;
		const leftOffset = contentRect.left - appRect.left;
		const topOffset = contentRect.top - appRect.top;
		const size: ISize = {
			width: Math.ceil(contentWidth + leftOffset + marginRight + borderRight + 1),
			height: Math.ceil(contentHeight + topOffset + marginBottom + borderBottom + 1),
		};

		if (Math.abs(window.innerWidth - size.width) <= 1 && Math.abs(window.innerHeight - size.height) <= 1) {
			return;
		}

		return this.resize(size, options);
	};
}
