/** @format */

import type { Optional } from "../common/utils";
import type { IAutoTransferredClassMetadata } from "./decorators";

declare global {
	namespace Reflect {
		/**
		 * Retrieves metadata for a class that has been decorated with `@AutoTransfer`.
		 * @author Karelian_na
		 * @date 2025/07/03
		 * @param metadataKey the metadata key to retrieve, should be "autoTransferMetadataKey"
		 * @param target the target class to retrieve metadata from
		 */
		function getOwnMetadata(metadataKey: "autoTransferMetadataKey", target: Object): Optional<IAutoTransferredClassMetadata>;
	}
}
