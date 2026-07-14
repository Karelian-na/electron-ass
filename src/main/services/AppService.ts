/** @format */

import type { IService } from "./ServiceProvider";
import type { ICommonAppService } from "../../common/services/IAppService";

import { app } from "electron/main";
import { Service } from "../decorators/Service";
import { AppServiceDomain } from "../../common/services/IAppService";
import { AutoTransferListenChannel, ChannelHandlerProvider } from "../decorators/Channel";

/**
 * Basic application service class, provides common application functionality in main process.
 *
 * @author Karelian_na
 * @date 2023/08/05
 */
@Service
@ChannelHandlerProvider(AppServiceDomain)
export class AppService implements IAppService {
	@AutoTransferListenChannel(app)
	declare getPath: IAppService["getPath"];

	@AutoTransferListenChannel(app)
	declare getAppPath: IAppService["getAppPath"];

	@AutoTransferListenChannel(app)
	declare getVersion: IAppService["getVersion"];

	@AutoTransferListenChannel(app)
	declare getName: IAppService["getName"];

	getInstance(): typeof app {
		return app;
	}
}

/**
 * Application interface for main process.
 *
 * @author Karelian_na
 * @date 2023/07/29
 */
export interface IAppService extends ICommonAppService, IService {
	/**
	 * Get electron app instance.
	 *
	 * @author Karelian_na
	 * @date 2026/03/17
	 */
	getInstance(): typeof app;
}
