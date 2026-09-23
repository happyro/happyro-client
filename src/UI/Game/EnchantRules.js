import DB from 'DB/DBManager.js';
function getSlotKey(slotNum) {
	return 'card' + (slotNum + 1);
}

function getSlotValue(item, slotNum) {
	if (!item || !item.slot) {
		return 0;
	}
	return item.slot[getSlotKey(slotNum)] || 0;
}

function setSlotValue(item, slotNum, value) {
	if (!item) {
		return;
	}
	if (!item.slot) {
		item.slot = {};
	}
	item.slot[getSlotKey(slotNum)] = value;
}

function getBaseSlotCount(item) {
	const it = DB.getItemInfo(item.ITID);
	const slotCount = it && it.slotCount ? parseInt(it.slotCount, 10) : 0;
	return isNaN(slotCount) ? 0 : slotCount;
}

function getItemGrade(item) {
	return item.enchantgrade || item.grade || 0;
}

function hasRandomOptions(item) {
	if (!item || !item.Options) {
		return false;
	}
	for (let i = 1; i < item.Options.length; i++) {
		if (item.Options[i] && item.Options[i].index > 0) {
			return true;
		}
	}
	return false;
}

function isTargetItem(item, group) {
	if (!item || !group || !group.targetItems) {
		return false;
	}
	const baseName = DB.getBasefromItemID(item.ITID);
	for (let i = 0; i < group.targetItems.length; i++) {
		const target = group.targetItems[i];
		if (target.id && target.id === item.ITID) {
			return true;
		}
		if (!target.id && baseName && target.base === baseName) {
			return true;
		}
	}
	return false;
}

function getNextEnchantSlot(item, group) {
	const slotOrder = group && group.slotOrder && group.slotOrder.length ? group.slotOrder : [0, 1, 2, 3];
	const baseSlots = getBaseSlotCount(item);
	for (let i = 0; i < slotOrder.length; i++) {
		const slotNum = slotOrder[i];
		if (slotNum < baseSlots) {
			continue;
		}
		if (!getSlotValue(item, slotNum)) {
			return slotNum;
		}
	}
	return null;
}

function getUpgradeCandidates(item, group) {
	const candidates = [];
	const slotOrder = group.slotOrder && group.slotOrder.length ? group.slotOrder : [0, 1, 2, 3];
	const baseSlots = getBaseSlotCount(item);
	for (let i = 0; i < slotOrder.length; i++) {
		const slotNum = slotOrder[i];
		if (slotNum < baseSlots) {
			continue;
		}
		const slotData = group.slots[slotNum];
		if (!slotData || !slotData.upgrade) {
			continue;
		}
		const currentId = getSlotValue(item, slotNum);
		if (!currentId) {
			continue;
		}
		const baseName = DB.getBasefromItemID(currentId);
		const entry = baseName ? slotData.upgrade[baseName] : null;
		if (!entry) {
			continue;
		}
		candidates.push({
			slotNum: slotNum,
			baseName: baseName,
			entry: entry,
			currentId: currentId
		});
	}
	return candidates;
}

function validateEnchantItem(item, group) {
	if (!group) {
		return { ok: false, message: '此附魔组缺少附魔数据。' };
	}
	if (!item) {
		return { ok: false, message: '物品无效。' };
	}
	if (item.WearState) {
		return { ok: false, message: '物品必须位于背包中。' };
	}
	if ((item.equipSwitch && item.equipSwitch > 0) || (item.EquipSwitch && item.EquipSwitch > 0)) {
		return { ok: false, message: '物品不能位于装备切换栏中。' };
	}
	if (item.attribute && item.attribute !== 0) {
		return { ok: false, message: '物品属性必须为普通。' };
	}
	if (!isTargetItem(item, group)) {
		return { ok: false, message: '物品不适用于此附魔组。' };
	}
	const refine = item.RefiningLevel || item.refiningLevel || 0;
	if (refine < group.condition.minRefine) {
		return { ok: false, message: '精炼等级过低。' };
	}
	const grade = getItemGrade(item);
	if (grade < group.condition.minGrade) {
		return { ok: false, message: '附魔等级过低。' };
	}
	if (!group.allowRandomOption && hasRandomOptions(item)) {
		return { ok: false, message: '不允许使用随机选项。' };
	}
	return { ok: true };
}

export {
	getSlotKey,
	getSlotValue,
	setSlotValue,
	getBaseSlotCount,
	getItemGrade,
	hasRandomOptions,
	isTargetItem,
	getNextEnchantSlot,
	getUpgradeCandidates,
	validateEnchantItem
};
