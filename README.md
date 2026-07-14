[![npm version](https://img.shields.io/npm/v/electron-ass.svg)](https://www.npmjs.com/package/electron-ass)
[![license](https://img.shields.io/npm/l/electron-ass.svg)](LICENSE)
[![types](https://img.shields.io/npm/types/electron-ass.svg)](https://www.npmjs.com/package/electron-ass)

# electron-ass

`electron-ass` is a TypeScript helper library for Electron applications. It provides decorators and base services for organizing the main process entry point, dependency injection, IPC channel registration, and preload APIs exposed to the renderer process.

It is useful when you want your Electron main process to be built from injectable services, while avoiding repetitive `ipcMain` / `ipcRenderer` wiring code.

## Features

- Application startup through `@ElectronApplication`
- Lightweight service registration and dependency injection with `@Service` / `@Autowired`
- IPC handler registration with `@ChannelHandlerProvider`, `@ListenChannel`, and `@HandleChannel`
- Preload API forwarding with `@AutoTransfer`
- Built-in `AppService`, `WindowManageService`, `EventService`, and `LogService`
- Shared types for window control, application information, and cross-process events

## Bundling Requirement

Applications that depend on this library must preserve class and function names during bundling/minification.

`electron-ass` uses decorators and runtime metadata to register services, resolve dependencies, and derive service names from constructors. If your bundler renames classes or functions, service injection and decorator-based behavior may break.

For Vite projects that use esbuild, set `keepNames: true` in the build configuration that bundles the Electron main process and preload code:

```ts
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

export default defineConfig({
  plugins: [
    electron({
      entry: {
        main: "src/electron-main/MainApp.ts",
        preload: "src/electron-main/preloads/preload.ts",
      },
      vite: {
        esbuild: {
          keepNames: true,
        },
      },
    }),
  ],
});
```

If you use another bundler or minifier, enable the equivalent option for preserving type, class, and function names.

## Requirements

- Node.js
- pnpm
- TypeScript
- Electron

The package currently declares this peer dependency:

```json
{
  "electron": "^22.3.21"
}
```

If your application uses a newer Electron version, verify compatibility in your project.

## Installation

```bash
pnpm add electron-ass reflect-metadata
pnpm add -D electron typescript
```

The example project in this repository uses a local link:

```json
{
  "dependencies": {
    "electron-ass": "link:.."
  }
}
```

## Quick Start

### 1. Create the application entry

In the Electron main process, extend `ElectronApp` and mark the startup class with `@ElectronApplication`:

```ts
import { globalShortcut } from "electron";
import { ElectronApp } from "electron-ass/main/ElectronApp";
import { Autowired, ElectronApplication } from "electron-ass/main/decorators";
import type { IAppService } from "electron-ass/main/services/AppService";
import type { IWindowManageService } from "electron-ass/main/services/WindowManagerServices";

import "./services";

@ElectronApplication
class MainApp extends ElectronApp {
  @Autowired
  private readonly appService!: IAppService;

  declare protected readonly windowManageService: IWindowManageService;

  override initApplication(): boolean {
    const app = this.appService.getInstance();

    app
      .on("activate", () => {
        if (this.windowManageService.getAllWindows().length === 0) {
          this.windowManageService.createMainWindow();
        }
      })
      .on("will-quit", () => {
        globalShortcut.unregisterAll();
      })
      .on("window-all-closed", () => {
        if (process.platform !== "darwin") {
          app.quit();
        }
      });

    return true;
  }

  override async startup(): Promise<void> {
    await this.windowManageService.createMainWindow();
  }
}
```

`@ElectronApplication` registers the class as the startup class and lets `AppEntry` create the application instance.

### 2. Define services

Use `@Service` to register a service and `@Autowired` to inject dependencies:

```ts
import { Service, Autowired } from "electron-ass/main/decorators";
import type { ILogService } from "electron-ass/main/services";

@Service
export class UserService {
  @Autowired
  private readonly logService!: ILogService;

  getCurrentUser() {
    this.logService.info("UserService::getCurrentUser");
    return { name: "Electron User" };
  }
}
```

By default, the service name is derived from the class name. For example, `UserService` is registered as `userService`. You can also inject by name:

```ts
@Autowired("userService")
private readonly users!: UserService;
```

### 3. Register IPC channels

Use `@ChannelHandlerProvider` to define a channel domain, then register methods with `@ListenChannel` or `@HandleChannel`:

```ts
import {
  ChannelHandlerProvider,
  HandleChannel,
  ListenChannel,
  Service,
} from "electron-ass/main/decorators";

@Service
@ChannelHandlerProvider("user")
export class UserChannelService {
  @HandleChannel()
  async getProfile(id: string) {
    return { id, name: "Electron User" };
  }

  @ListenChannel()
  ping(message: string) {
    console.log(message);
  }
}
```

The example above registers:

- `user::getProfile`: an async channel intended for `ipcRenderer.invoke`
- `user::ping`: a send/listen channel intended for `ipcRenderer.send` or synchronous call scenarios

If a channel name already contains `::`, the library uses it as the full channel name.

### 4. Expose APIs in preload

The library provides base application and window APIs that can be exposed with `contextBridge`:

```ts
import { contextBridge } from "electron";
import { AppAPI } from "electron-ass/main/exposes/app";
import { WindowAPI } from "electron-ass/main/exposes/win";

contextBridge.exposeInMainWorld("app", new AppAPI());
contextBridge.exposeInMainWorld("win", new WindowAPI());
```

Renderer code can then call:

```ts
window.app.getName();
window.app.getVersion();

await window.win.resize({ width: 800, height: 600 }, { animate: true });
window.win.close();
window.win.sticky(true);
```

Add renderer-side types with the shared interfaces:

```ts
import type { IApplicationAPI, IWindowAPI } from "electron-ass/common/interfaces";

declare global {
  interface Window {
    app: IApplicationAPI;
    win: IWindowAPI;
  }
}
```

## Built-in Services

| Service | Description |
| --- | --- |
| `AppService` | Wraps Electron `app` and exposes app name, version, paths, and the app instance |
| `WindowManageService` | Creates, finds, resizes, pins, and closes windows; opens paths and external links |
| `EventService` | Sends and invokes events between the main process and renderer processes; registers IPC handlers |
| `MainLogService` | Default main-process logging service |
| `InstantiationService` | Creates instances and injects registered services |

## Common Imports

```ts
import { ElectronApp } from "electron-ass/main/ElectronApp";
import { AppEntry } from "electron-ass/main/AppEntry";
import { Service, Autowired, ElectronApplication } from "electron-ass/main/decorators";
import { AppService, WindowManageService, EventService } from "electron-ass/main/services";
import { AppAPI } from "electron-ass/main/exposes/app";
import { WindowAPI } from "electron-ass/main/exposes/win";

import type { IApplicationAPI, IWindowAPI } from "electron-ass/common/interfaces";
import { IpcEvents } from "electron-ass/common/events";
```

## Run the Example

Install dependencies:

```bash
pnpm install
```

Build the library:

```bash
pnpm build
```

Run the example project:

```bash
pnpm build-example
```

You can also run it from the `examples` directory:

```bash
cd examples
pnpm dev
```

## Build

```bash
pnpm build-common
pnpm build-main
pnpm build
```

Build output is written to `dist/`:

- `dist/common`: shared types, events, utilities, and renderer-safe interfaces
- `dist/main`: main-process entry helpers, decorators, services, and preload API classes
- `dist/types`: TypeScript declaration files

## Project Structure

```text
.
+-- src
|   +-- common
|   |   +-- decorators
|   |   +-- interfaces
|   |   +-- services
|   |   +-- utils
|   +-- main
|       +-- decorators
|       +-- exposes
|       +-- services
|       +-- AppEntry.ts
|       +-- ElectronApp.ts
+-- examples
    +-- src
        +-- common
        +-- electron-main
        +-- electron-sandbox
```

## TypeScript Configuration

Decorator support must be enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

This library depends on `reflect-metadata`. Make sure it is installed when using decorators and service injection.

## Example Coverage

The current `examples/` project demonstrates:

- A custom `WindowManageService`
- Creating the main window with a preload script
- Exposing application information with `AppAPI`
- Exposing window operations such as resize, close, and sticky with `WindowAPI`
- Listening for the `windowBeforeClose` event
- Vite + `vite-plugin-electron` development startup
- Preserving names through `esbuild.keepNames: true`

## License

MIT License. This project is open source and free to use.
