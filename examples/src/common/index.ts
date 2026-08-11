import type { IWindowAPI, IApplicationAPI } from "electron-ass/common/interfaces";

export interface IMainWindowAPI {
	app: IApplicationAPI;
	win: IWindowAPI;
}
