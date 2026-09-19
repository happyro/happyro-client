import { describe, expect, it } from 'vitest';
import SU from '../../src/DB/Skills/SkillUnitConst.js';
import {
	fourthJobBsonGroundNames,
	fourthJobGroundEffects,
	fourthJobGroundUnits,
	fourthJobGroundEndEffects,
	registerFourthJobBsonGroundEffects
} from '../../src/DB/Skills/FourthJobGroundEffects.js';

function fixture() {
	return Object.fromEntries([...fourthJobBsonGroundNames].map(name => [name, {
		FilePath: `SOUL_ASCETIC\\SOA_TOTEM_OF_TUTELARY\\${name}.str`,
		IsFloor: name.includes('bottom'), IsInfinite: name.includes('loop'),
		StartDelayTime: name.includes('loop') ? 208 : 0
	}]));
}

describe('fourth-job BSON ground phases', () => {
	it('keeps end animations out of creation and only loops the persistent layers', () => {
		const table = {};
		registerFourthJobBsonGroundEffects(fixture(), table);
		const active = table[fourthJobGroundUnits[SU.UNT_TOTEM_OF_TUTELARY]];
		const end = table[fourthJobGroundEndEffects[SU.UNT_TOTEM_OF_TUTELARY]];
		expect(active).toHaveLength(4);
		expect(active.every(layer => !layer.file.endsWith('_end'))).toBe(true);
		expect(active.filter(layer => layer.repeat)).toHaveLength(2);
		expect(active.filter(layer => layer.repeat).every(layer => layer.delayStart === 208)).toBe(true);
		expect(active.filter(layer => layer.renderBeforeEntities)).toHaveLength(2);
		expect(end).toHaveLength(2);
		expect(end.every(layer => !layer.repeat && !layer.attachedEntity && layer.delayStart === 0)).toBe(true);
	});

	it('requires all configured phases instead of silently creating an incomplete zone', () => {
		const bson = fixture();
		delete bson.totem_of_tutelary_loop;
		expect(() => registerFourthJobBsonGroundEffects(bson, {})).toThrow('totem_of_tutelary_loop');
	});

	it('includes representative ground units from other fourth-job classes', () => {
		for (const unit of [SU.UNT_DEEPBLINDTRAP, SU.UNT_FLAMETRAP, SU.UNT_TWINKLING_GALAXY]) {
			expect(fourthJobGroundUnits[unit]).toBeDefined();
			expect(fourthJobGroundUnits[unit] in fourthJobGroundEffects).toBe(true);
		}
	});
});
