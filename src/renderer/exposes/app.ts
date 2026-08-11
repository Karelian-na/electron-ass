/** @format */

import type { IEventsMap } from "../../common/services";
import type { IApplicationAPI } from "../../common/interfaces/IApplicationAPI";

import { EventEmitter } from "./common";
import { AutoTransfer } from "../decorators";
import { AppServiceDomain } from "../../common/services/IAppService";

@AutoTransfer(AppServiceDomain)
export class AppAPI<IPCEM extends IEventsMap = {}, IEM extends IEventsMap = {}>
	extends EventEmitter<IPCEM, IEM>
	implements IApplicationAPI
{
	@AutoTransfer(EventEmitter.sendSyncWithError)
	getPath!: IApplicationAPI["getPath"];

	@AutoTransfer(EventEmitter.sendSyncWithError)
	getName!: IApplicationAPI["getName"];

	@AutoTransfer(EventEmitter.sendSyncWithError)
	getAppPath!: IApplicationAPI["getAppPath"];

	@AutoTransfer(EventEmitter.sendSyncWithError)
	getVersion!: IApplicationAPI["getVersion"];
}
