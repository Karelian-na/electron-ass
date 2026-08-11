/** @format */

import { AutoTransfer } from "electron-ass/renderer/decorators";
import { WindowAPI as BaseWindowAPI } from "electron-ass/renderer/exposes/win";
import { WindowManageServiceDomain } from "electron-ass/common/services/IWindowManageService";

@AutoTransfer(WindowManageServiceDomain)
class WindowAPI extends BaseWindowAPI {
	protected override _getContentElement(): HTMLElement {
		return document.getElementById("app-content")!;
	}
}

export default new WindowAPI();
