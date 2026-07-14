/** @format */

import { contextBridge } from "electron";

import win from "../exposes/win";
import { AppAPI } from "electron-ass/main/exposes/app";

const app = new AppAPI();

contextBridge.exposeInMainWorld("app", app);
contextBridge.exposeInMainWorld("win", win);
