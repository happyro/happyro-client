import ShortCut from 'UI/Components/ShortCut/ShortCut.js';
import Inventory from 'UI/Components/Inventory/Inventory.js';
import SkillWindow from 'UI/Components/SkillList/SkillList.js';
import SkillTargetSelection from 'UI/Components/SkillTargetSelection/SkillTargetSelection.js';
import { canExecuteSkill } from 'UI/Components/SkillList/SkillUse.js';
import SkillInfo from 'DB/Skills/SkillInfo.generated.js';
import { equipment, usableItems as usable, itemQuantity } from './InventoryItems.js';
import DB from 'DB/DBManager.js';
import Client from 'Core/Client.js';
import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import Camera from 'Renderer/Camera.js';
import Altitude from 'Renderer/Map/Altitude.js';
import Mouse from 'Controls/MouseEventHandler.js';
import { remainingCooldown } from 'Network/SkillCooldowns.js';
import { createShortcutController } from './ShortcutController.js';
import { canTargetSkill } from './SkillTargets.js';

export function createGameShortcuts(moving = () => false) {
	const icons = new Map();
	function icon(file) {
		if (!file) return '';
		if (!icons.has(file)) {
			icons.set(file, '');
			Client.loadFile(`${DB.INTERFACE_PATH}item/${file}.bmp`, url => icons.set(file, url));
		}
		return icons.get(file);
	}
	function describe(binding) {
		if (binding.isSkill) {
			const skill = ShortCut.getSkillById(binding.ID),
				info = SkillInfo[binding.ID];
			let reason = !canExecuteSkill(skill)
				? '技能不可用'
				: binding.count < 1 || binding.count > skill.level
					? '技能等级不可用'
					: '';
			if (!reason && binding.count === skill.level && skill.spcost > Session.Entity.life.sp) reason = 'SP 不足';
			return {
				name: info?.SkillName || `技能 ${binding.ID}`,
				icon: icon(info?.Name),
				amount: `Lv.${binding.count}`,
				reason
			};
		}
		const item = Inventory.getUI().getItemById(binding.ID),
			info = DB.getItemInfo(binding.ID);
		const file = item && !item.IsIdentified ? info.unidentifiedResourceName : info.identifiedResourceName;
		const reason = !itemQuantity(item)
			? '道具已用完'
			: !usable.includes(item.type)
				? '此物品不能快捷使用'
				: equipment.includes(item.type) && (!item.IsIdentified || item.IsDamaged)
					? '装备不可用'
					: '';
		return {
			name: item ? DB.getItemName(item) : info.identifiedDisplayName,
			icon: icon(file),
			amount: itemQuantity(item),
			reason
		};
	}
	return createShortcutController({
		bindings: () => ShortCut.getList(),
		skill: id => ShortCut.getSkillById(id),
		cooldown: remainingCooldown,
		describe,
		canUse: () =>
			Boolean(
				Session.Playing &&
				!Session.FreezeUI &&
				Session.Entity &&
				Session.Entity.action !== Session.Entity.ACTION.DIE
			),
		target: () => EntityManager.getFocusEntity(),
		self: () => Session.Entity,
		supportPicking: value => EntityManager.setSupportPicking(value),
		canTarget: (target, flag) =>
			Boolean(
				target &&
				EntityManager.get(target.GID) === target &&
				canTargetSkill(target, flag, { self: Session.Entity, canAttack: SkillTargetSelection.checkMapState })
			),
		castId: (id, level, target) => SkillTargetSelection.onUseSkillToId(id, level, target, { allowMove: !moving() }),
		castGround: (...args) => SkillTargetSelection.onUseSkillToPos(...args),
		useItem: id => {
			const item = Inventory.getUI().getItemById(id);
			if (item) Inventory.getUI().useItem(item);
		},
		hasItem: id => {
			const item = Inventory.getUI().getItemById(id);
			return Boolean(itemQuantity(item) && usable.includes(item.type));
		},
		configure: (...args) => ShortCut.configure(...args),
		candidates: () => [
			...SkillWindow.getUI()
				.getSkills()
				.filter(canExecuteSkill)
				.map(skill => ({
					isSkill: true,
					ID: skill.SKID,
					level: skill.level,
					...describe({ isSkill: true, ID: skill.SKID, count: skill.level })
				})),
			...Inventory.getUI()
				.list.filter(item => itemQuantity(item) && usable.includes(item.type))
				.filter((item, i, list) => list.findIndex(other => other.ITID === item.ITID) === i)
				.map(item => ({ isSkill: false, ID: item.ITID, ...describe({ isSkill: false, ID: item.ITID }) }))
		],
		pick: (x, y) => {
			Mouse.screen.x = x;
			Mouse.screen.y = y;
			const pos = [];
			const ground = Altitude.intersect(Camera.modelView, Camera.projection, pos) ? pos : null;
			return { ground, target: EntityManager.intersect() };
		}
	});
}
