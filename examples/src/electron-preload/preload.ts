/** @format */

import type { IMainWindowAPI } from "common";

import { AppAPI } from "electron-ass/renderer/exposes/app";
import { Expose } from "electron-ass/renderer/decorators";

import win from "./exposes/win";

@Expose
class MainAPI implements IMainWindowAPI {
	app = new AppAPI();
	win = win;
}
