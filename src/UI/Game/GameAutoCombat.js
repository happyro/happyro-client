import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import Renderer from 'Renderer/Renderer.js';
import MapControl from 'Controls/MapControl.js';
import PathFinding from 'Utils/PathFinding.js';
import Altitude from 'Renderer/Map/Altitude.js';
import SkillWindow from 'UI/Components/SkillList/SkillList.js';
import SkillTargetSelection from 'UI/Components/SkillTargetSelection/SkillTargetSelection.js';
import { canExecuteSkill, SKILL_INF } from 'UI/Components/SkillList/SkillUse.js';
import SkillInfo from 'DB/Skills/SkillInfo.generated.js';
import DB from 'DB/DBManager.js';
import { remainingCooldown } from 'Network/SkillCooldowns.js';
import * as Commands from './GameCommands.js';
import { createAutoCombatController } from './AutoCombatController.js';

export function createGameAutoCombat(enabled) {
	function targets() {
		const result = [];
		EntityManager.forEach(entity => {
			if (
				entity.objecttype !== entity.constructor.TYPE_MOB ||
				entity.action === entity.ACTION.DIE ||
				entity.remove_tick > 0
			)
				return;
			result.push({
				id: entity.GID,
				species: entity.job,
				name: DB.getMonsterName(entity.job) || entity.display.name,
				position: [...entity.position]
			});
		});
		return result;
	}
	function skills() {
		return SkillWindow.getUI()
			.getSkills()
			.filter(skill => canExecuteSkill(skill) && skill.type & (SKILL_INF.ENEMY | SKILL_INF.PLACE))
			.map(skill => {
				const reason =
					remainingCooldown(skill.SKID) > 0
						? '冷却中'
						: skill.spcost > Session.Entity.life.sp
							? 'SP 不足'
							: '';
				return {
					id: skill.SKID,
					name: SkillInfo[skill.SKID]?.SkillName || `技能 ${skill.SKID}`,
					level: skill.level,
					type: skill.type,
					available: !reason,
					reason
				};
			});
	}
	function stop() {
		const chasing = Boolean(Session.moveAction);
		Commands.stopAttack();
		if (chasing && Session.Playing && Session.Entity && Session.Entity.action !== Session.Entity.ACTION.DIE) {
			const packet = new PACKET.CZ.REQUEST_MOVE2();
			packet.dest[0] = Math.round(Session.Entity.position[0]);
			packet.dest[1] = Math.round(Session.Entity.position[1]);
			Network.sendPacket(packet);
		}
		MapControl.onRequestStopWalk();
		Session.autoFollow = false;
	}
	return createAutoCombatController({
		enabled: () =>
			enabled() && !Session.Entity?.isOverWeight && Session.Entity?.action !== Session.Entity?.ACTION.SIT,
		now: () => performance.now(),
		random: Math.random,
		position: () => Session.Entity.position,
		targets,
		skills,
		stop,
		chasing: () => Boolean(Session.moveAction),
		busy: () =>
			Boolean(Session.moveAction || Session.Entity.cast?.display || Session.Entity.amotionTick > Renderer.tick),
		reachable: target =>
			PathFinding.search(
				Session.Entity.position[0] | 0,
				Session.Entity.position[1] | 0,
				target.position[0] | 0,
				target.position[1] | 0,
				1,
				[],
				Altitude.TYPE.WALKABLE
			) > 0,
		select: target => {
			const entity = EntityManager.get(target.id),
				previous = EntityManager.getFocusEntity();
			if (previous && previous !== entity) previous.onFocusEnd();
			EntityManager.setFocusEntity(entity);
			EntityManager.setOverEntity(entity);
			entity.onFocus({ attack: false });
		},
		act: (target, skill) => {
			const entity = EntityManager.get(target.id);
			if (!entity || entity.action === entity.ACTION.DIE || entity.remove_tick > 0) return false;
			if (!skill) {
				Commands.attackSelected();
				return true;
			}
			const current = skills().find(entry => entry.id === skill.id && entry.available);
			if (!current) return false;
			Commands.stopAttack();
			if (current.type & SKILL_INF.PLACE)
				return SkillTargetSelection.onUseSkillToPos(
					current.id,
					current.level,
					entity.position[0],
					entity.position[1]
				);
			return SkillTargetSelection.onUseSkillToId(current.id, current.level, target.id);
		}
	});
}
