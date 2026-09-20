import { describe, expect, it } from 'vitest';
import SkillAction from '../../src/DB/Skills/SkillAction.js';
import SK from '../../src/DB/Skills/SkillConst.js';

describe('fourth-job weapon actions', () => {
	it.each(['WH_GALESTORM', 'WH_CRESCIVE_BOLT'])('%s uses the visible ranged weapon action', name => {
		const entity = { ACTION: { ATTACK3: 11, IDLE: 0 } };
		expect(SkillAction[SK[name]](entity, 0)).toMatchObject({
			action: entity.ACTION.ATTACK3,
			next: { action: entity.ACTION.IDLE }
		});
	});
});
