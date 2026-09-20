import { describe, expect, it } from 'vitest';
import SK from '../../src/DB/Skills/SkillConst.js';
import {
	fourthJobEffectResources,
	fourthJobRenderEffects,
	fourthJobSkillEffects,
	fourthJobStatusEffects
} from '../../src/DB/Skills/FourthJobEffects.js';
import StatusConst from '../../src/DB/Status/StatusConst.js';

function filesOf(resources) {
	return [resources?.files ?? resources].flat();
}

describe('fourth-job explicit skill effects', () => {
	it('registers every configured stage and all of its visual layers', () => {
		for (const [name, stages] of Object.entries(fourthJobEffectResources)) {
			const mapped = fourthJobSkillEffects[SK[name]];
			expect(mapped, name).toBeDefined();
			for (const [stage, resources] of Object.entries(stages)) {
				const effectId = mapped[stage];
				const layers = fourthJobRenderEffects[effectId];
				expect(layers, `${name}.${stage}`).toHaveLength(filesOf(resources).length);
				expect(layers.map(layer => layer.file), `${name}.${stage}`).toEqual(filesOf(resources));
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

	it('preserves high-value visual semantics for status, projectile, and summon samples', () => {
		const servantStatus = fourthJobRenderEffects[fourthJobStatusEffects[StatusConst.SERVANTWEAPON]];
		expect(servantStatus).toMatchObject([{ attachedEntity: true, repeat: true }]);

		const servantShot = fourthJobRenderEffects[fourthJobSkillEffects[SK.DK_SERVANTWEAPON_ATK].beforeHitEffectId];
		expect(servantShot).toHaveLength(2);
		expect(servantShot.every(layer => layer.travelsFromOther)).toBe(true);

		const summon = fourthJobSkillEffects[SK.MT_SUMMON_ABR_BATTLE_WARIOR];
		expect(fourthJobRenderEffects[summon.beginCastEffectId]).toHaveLength(1);
		expect(fourthJobRenderEffects[summon.effectId]).toHaveLength(2);
	});
});
