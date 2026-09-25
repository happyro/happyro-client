import Session from 'Engine/SessionStorage.js';
import { maintainCurrentCharacter } from 'UI/Components/GameTools/AdventureControlService.js';

const states = new WeakMap();
const commands = {
	base: ['character.stats.reset', '基础素质点'],
	traits: ['character.traits.reset', '四转素质点'],
	skills: ['character.skills.reset', '技能点']
};

export function pointResetState(entity) {
	return states.get(entity) || { pending: false, message: '' };
}

export async function resetCharacterPoints(kind, entity) {
	if (
		!commands[kind] ||
		!entity ||
		entity !== Session.Entity ||
		!Session.Playing ||
		entity.action === entity.ACTION.DIE
	)
		return '当前不能重置点数';
	if (pointResetState(entity).pending) return '正在重置，请稍候';
	const [command, label] = commands[kind];
	const state = { pending: true, message: `正在重置${label}…` };
	states.set(entity, state);
	try {
		await maintainCurrentCharacter(command, {});
		state.message = `${label}已重置`;
	} catch (error) {
		state.message = error.message;
	} finally {
		state.pending = false;
	}
	return entity === Session.Entity && Session.Playing ? state.message : '角色会话已变更';
}
