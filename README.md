[![npm version](https://img.shields.io/npm/v/electron-ass.svg)](https://www.npmjs.com/package/electron-ass)
[![license](https://img.shields.io/npm/l/electron-ass.svg)](LICENSE)
[![types](https://img.shields.io/npm/types/electron-ass.svg)](https://www.npmjs.com/package/electron-ass)

# electron-ass

`electron-ass` is a TypeScript helper library for Electron applications. It provides decorators and base services for organizing the main process entry point, dependency injection, IPC channel registration, and preload APIs exposed to the renderer process.

It is useful when you want your Electron main process to be built from injectable services, while avoiding repetitive `ipcMain` / `ipcRenderer` wiring code.

> [!WARNING]
> This library is under active development. Its APIs, package entry points, configuration requirements, and runtime behavior may change at any time, including backward-incompatible changes. Pin the package version and review release changes before upgrading.

## Features

- Application startup through `@ElectronApplication`
- Lightweight service registration and dependency injection with `@Service` / `@Autowired`
- IPC handler registration with `@ChannelHandlerProvider`, `@ListenChannel`, and `@HandleChannel`
- Preload API forwarding with `@AutoTransfer` and context-bridge exposure with `@Expose`
- Built-in `AppService`, `WindowManageService`, `EventService`, and `LogService`
- Shared types for window control, application information, and cross-process events
- Structured IPC error propagation across Electron's structured-clone boundary
- Separate `main`, `renderer` (preload), and `common` entry points to keep environment-specific types isolated

## Bundling Requirement

`electron-ass` is distributed as bundler-oriented ESM. Applications must bundle the library together with their Electron main-process and preload code using Vite, Rollup, Webpack, esbuild, or an equivalent bundler. The files under `dist/` are not intended to be loaded directly by Node.js or Electron without bundling.

TypeScript consumers should use the bundler resolution model:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

Applications must also preserve class and function names during bundling/minification.

`electron-ass` uses decorators and runtime metadata to register services, resolve dependencies, and derive service names from constructors. If your bundler renames classes or functions, service injection and decorator-based behavior may break.

For Vite projects that use esbuild, set `keepNames: true` in the build configuration that bundles the Electron main process and preload code:

```ts
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

export default defineConfig({
  plugins: [
    electron([
      {
        entry: { main: "src/electron-main/MainApp.ts" },
        vite: {
          esbuild: { keepNames: true },
        },
      },
      {
        entry: { preload: "src/electron-preload/preload.ts" },
        vite: {
          esbuild: { keepNames: true },
        },
      },
    ]),
  ],
});
```

If you use another bundler or minifier, enable the equivalent option for preserving type, class, and function names.

## Requirements

- A bundler capable of consuming ESM packages
- TypeScript with legacy decorator support
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
pnpm add electron-ass
pnpm add -D electron typescript
```

`reflect-metadata` is installed as a runtime dependency of `electron-ass`.

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

Preload helpers now live under the dedicated `renderer` entry point. This keeps `contextBridge`, `ipcRenderer`, and DOM-dependent types out of the main-process build.

Use `@Expose` to construct a preload API and expose each enumerable property through `contextBridge.exposeInMainWorld`:

```ts
import type { IApplicationAPI, IWindowAPI } from "electron-ass/common/interfaces";

import { Expose } from "electron-ass/renderer/decorators";
import { AppAPI } from "electron-ass/renderer/exposes/app";
import { WindowAPI } from "electron-ass/renderer/exposes/win";

interface IMainWindowAPI {
  app: IApplicationAPI;
  win: IWindowAPI;
}

@Expose
class MainAPI implements IMainWindowAPI {
  app = new AppAPI();
  win = new WindowAPI();
}
```

Use `@Expose(worldId)` instead when exposing the properties into a specific isolated world.

Keep `nodeIntegration` disabled for windows that consume this API and load the generated preload bundle explicitly:

```ts
const windowOptions = {
  webPreferences: {
    preload: "/absolute/path/to/preload.js",
    nodeIntegration: false,
    contextIsolation: true,
  },
};
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

Place this augmentation in a uniquely named declaration file such as `global.d.ts`; avoid giving it the same base name as a neighboring `.ts` file.

## IPC Error Propagation

The IPC forwarding layer converts errors into structured-clone-safe values before sending them across process boundaries. Main-process handlers registered through `@HandleChannel` are surfaced by the renderer helpers as rejected calls, while errors raised by renderer event listeners are wrapped in `IpcErrorResult` and restored before `EventService.invokeIpcEvent` rejects in the main process.

Callers should handle transferred failures as ordinary rejected promises:

```ts
try {
  await window.win.showOpenDialog({});
} catch (error) {
  console.error("IPC request failed", error);
}
```

Because Electron serializes IPC payloads, custom `Error` subclasses and non-enumerable properties should not be expected to retain their original prototypes automatically.

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

import { Expose, AutoTransfer } from "electron-ass/renderer/decorators";
import { AppAPI } from "electron-ass/renderer/exposes/app";
import { WindowAPI } from "electron-ass/renderer/exposes/win";

import type { IApplicationAPI, IWindowAPI } from "electron-ass/common/interfaces";
import { IpcEvents } from "electron-ass/common/events";
```

## Run the Example

Install and build the library first:

```bash
pnpm install
pnpm build
```

The example is a separate pnpm workspace, so install its dependencies separately:

```bash
cd examples
pnpm install
```

Start the Vite development server and Electron application:

```bash
pnpm dev
```

From the repository root, `pnpm build-example` performs a production build of the example and writes it to `examples/out/`; it does not start Electron.

## Build

```bash
pnpm build
```

The build uses TypeScript project references to compile `common`, `main`, and `renderer` together.

Build output is written to `dist/`:

- `dist/common`: shared types, events, utilities, and renderer-safe interfaces
- `dist/main`: Electron main-process entry helpers, decorators, and services
- `dist/renderer`: preload-side decorators and APIs that use `contextBridge` / `ipcRenderer`
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
|   |   +-- decorators
|   |   +-- services
|   |   +-- AppEntry.ts
|   |   +-- ElectronApp.ts
|   +-- renderer
|       +-- decorators
|       +-- exposes
+-- examples
    +-- src
        +-- common
        +-- electron-main
        +-- electron-preload
        +-- electron-sandbox
```

## TypeScript Configuration

Decorator support must be enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

The bundler must process both the Electron main-process and preload imports from this package. Directly executing the unbundled files in `dist/` is outside the supported usage model.

## Example Coverage

The current `examples/` project demonstrates:

- A custom `WindowManageService`
- Creating the main window with a preload script
- Keeping `nodeIntegration` disabled and exposing APIs through `contextBridge`
- Exposing application information with `AppAPI` and `@Expose`
- Extending `WindowAPI` in the preload project for application-specific DOM sizing
- Exposing window operations such as resize, close, and sticky with `WindowAPI`
- Listening for the `windowBeforeClose` event
- Separate Vite builds for Electron main and preload entry points
- An ESM `vite.config.mts` that avoids Vite's deprecated CJS Node API
- Preserving names through `esbuild.keepNames: true`

## License

MIT License. This project is open source and free to use.
