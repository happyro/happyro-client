/* Archived: itemInfo_true.lub now contains the complete item localization.

const FIELD_COUNT = 4;

export function applyItemLocalization(itemTable, localization) {
	let localizedCount = 0;

	for (const [itemId, fields] of Object.entries(localization)) {
		if (!Array.isArray(fields) || fields.length !== FIELD_COUNT) {
			throw new TypeError(`Invalid item localization entry: ${itemId}`);
		}

		const item = itemTable[itemId];
		if (!item) {
			continue;
		}

		const [unidentifiedName, identifiedName, unidentifiedDescription, identifiedDescription] = fields;
		if (
			typeof unidentifiedName !== 'string' ||
			typeof identifiedName !== 'string' ||
			!Array.isArray(unidentifiedDescription) ||
			!Array.isArray(identifiedDescription)
		) {
			throw new TypeError(`Invalid item localization fields: ${itemId}`);
		}

		item.unidentifiedDisplayName = unidentifiedName;
		item.identifiedDisplayName = identifiedName;
		item.unidentifiedDescriptionName = unidentifiedDescription.slice();
		item.identifiedDescriptionName = identifiedDescription.slice();
		localizedCount++;
	}

	return localizedCount;
}
*/
