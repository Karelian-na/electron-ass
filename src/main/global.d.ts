/** @format */

import type { Optional } from "../common/utils";
import type { IAutoTransferredClassMetadata } from "./decorators/renderer";
import type { IServiceMetadataInfo, IChannelHandlerMetadata } from "./decorators";

declare global {
	namespace Reflect {
		/**
		 * Retrieves metadata for a class that has been decorated with `@Service`.
		 *
		 * @author Karelian_na
		 * @date 2026/06/03
		 * @param metadataKey the metadata key to retrieve, should be "serviceMetadataKey"
		 * @param target the target class to retrieve metadata from
		 * @param propertyKey the property key to retrieve metadata from, if applicable
		 */
		function getMetadata(metadataKey: "serviceMetadataKey", target: Object, propertyKey?: string | symbol): Optional<IServiceMetadataInfo>;

		/**
		 * Retrieves metadata for a class that has been decorated with `@PostConstrcut`.
		 *
		 * @author Karelian_na
		 * @date 2026/06/03
		 * @param metadataKey the metadata key to retrieve, should be "postConstructMetadataKey"
		 * @param target the target class to retrieve metadata from
		 * @param propertyKey the property key to retrieve metadata from, if applicable
		 */
		function getMetadata(metadataKey: "postConstructMetadataKey", target: Object, propertyKey?: string | symbol): Optional<Array<Function>>;

		/**
		 *  Retrieves metadata for a class that has been decorated with `@ChannelHandler`.
		 *
		 * @author Karelian_na
		 * @date 2026/06/03
		 * @param metadataKey the metadata key to retrieve, should be "channelHandlerMetadataKey"
		 * @param target the target class to retrieve metadata from
		 * @param propertyKey the property key to retrieve metadata from, if applicable
		 */
		function getMetadata(
			metadataKey: "channelHandlerMetadataKey",
			target: Object,
			propertyKey?: string | symbol,
		): Optional<IChannelHandlerMetadata>;

		/**
		 * Retrieves metadata for a class that has been decorated with `@AutoTransfer`.
		 * @author Karelian_na
		 * @date 2025/07/03
		 * @param metadataKey the metadata key to retrieve, should be "autoTransferMetadataKey"
		 * @param target the target class to retrieve metadata from
		 */
		function getOwnMetadata(metadataKey: "autoTransferMetadataKey", target: Object): Optional<IAutoTransferredClassMetadata>;
	}

	namespace Electron {
		interface BrowserWindow {
			_animateInterval?: ReturnType<typeof setInterval>;
			_cancelAnimate?: () => void;
		}
	}
}
