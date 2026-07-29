/** @format */

import type { IMainWindowAPI } from "common";

import { AppAPI } from "electron-ass/main/exposes/app";
import { Expose } from "electron-ass/main/decorators/renderer";

import win from "../exposes/win";

@Expose
class MainAPI implements IMainWindowAPI {
	app = new AppAPI();
	win = win;
}
