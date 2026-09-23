import DB from 'DB/DBManager.js';
import { showInteraction, clearInteraction, interactionSnapshot } from './ServerInteraction.js';
import { toPlainRagnarokText } from 'Utils/RagnarokText.js';

export function openMonsterInformation(packet) {
	const token = Symbol('monster-information');
	const races = [2285, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283, 2284];
	const message = id => toPlainRagnarokText(DB.getMessage(id));
	const rows = [
		['名称', toPlainRagnarokText(DB.getMonsterName(packet.job))],
		['等级', packet.level],
		['体型', message(443 + packet.size)],
		['种族', message(races[packet.raceType])],
		['HP', packet.hp],
		['防御', packet.def],
		['魔法防御', packet.mdefPower],
		['属性', message(414 + packet.property)]
	];
	for (const [key, id] of Object.entries({
		water: 415,
		earth: 416,
		fire: 417,
		wind: 418,
		poison: 419,
		saint: 420,
		dark: 421,
		mental: 422,
		undead: 423
	}))
		rows.push([`${message(id)}属性倍率`, `${packet.propertyTable[key]}%`]);
	showInteraction({
		kind: 'information',
		title: '怪物识别',
		token,
		rows,
		close: () => {
			if (interactionSnapshot()?.token === token) clearInteraction('information');
		}
	});
}
