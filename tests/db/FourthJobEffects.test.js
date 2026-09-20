import { describe, expect, it } from 'vitest';
import SK from '../../src/DB/Skills/SkillConst.js';
import {
	fourthJobEffectResources,
	fourthJobRenderEffects,
	fourthJobSkillEffects
} from '../../src/DB/Skills/FourthJobEffects.js';

describe('fourth-job explicit skill effects', () => {
	it('registers every configured stage and all of its visual layers', () => {
		for (const [name, stages] of Object.entries(fourthJobEffectResources)) {
			const mapped = fourthJobSkillEffects[SK[name]];
			expect(mapped, name).toBeDefined();
			for (const [stage, resources] of Object.entries(stages)) {
				const effectId = mapped[stage];
				const layers = fourthJobRenderEffects[effectId];
				expect(layers, `${name}.${stage}`).toHaveLength([resources].flat().length);
				expect(layers.map(layer => layer.file), `${name}.${stage}`).toEqual([resources].flat());
				expect(layers.every(layer => layer.texturePath.endsWith('/'))).toBe(true);
			}
		}
	});

	it('maps representative classes and secondary damage packet IDs', () => {
		for (const name of [
			'SHC_POTENT_VENOM', 'MT_AXE_STOMP', 'CD_REPARATIO', 'WH_FLAMETRAP',
			'ABC_CHAIN_REACTION_SHOT_ATK', 'BO_HELLTREE', 'EM_ELEMENTAL_BUSTER_FIRE',
			'IQ_JUDGE', 'TR_ROSEBLOSSOM_ATK', 'HN_JUPITEL_THUNDER_STORM'
		]) {
			expect(fourthJobSkillEffects[SK[name]], name).toBeDefined();
		}
	});
});
