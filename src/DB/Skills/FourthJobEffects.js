import SK from './SkillConst.js';

// Explicit associations with STR assets in the deployed kRO resource set.
// Each nested STR uses textures relative to its own directory.
// Expanded-job effects are already loaded from ez2streffect.bson; do not
// duplicate those entries here, as that would play the same STR twice.
export const fourthJobEffectResources = {
	DK_SERVANTWEAPON: {
		beginCastEffectId: 'servantweapon/servantweapon_cast/servantweapon_cast',
		effectId: 'servantweapon/servantweapon/servantweapon'
	},
	DK_MADNESS_CRUSHER: { hitEffectId: 'madness_crusher/madness_crusher/madness_crusher' },
	DK_VIGOR: { effectId: 'vigor/vigor_cast/vigor_cast' },
	MT_A_MACHINE: {
		beginCastEffectId: 'a_machine/a_machine_cast/a_machine_cast',
		hitEffectId: 'a_machine/a_machine_hit/a_machine_hit'
	},
	SHC_SHADOW_EXCEED: { effectId: 'shadow_exceed/shadow_exceed/shadow_exceed' },
	SHC_DANCING_KNIFE: {
		effectIdOnCaster: 'dancing_knife/dancing_knife_cast/dancing_knife_cast',
		hitEffectId: 'dancing_knife/dancing_knife_hit/dancing_knife_hit'
	},
	SHC_SAVAGE_IMPACT: { hitEffectId: 'savage_impact/savage_impact_hit/savage_impact_hit' },
	SHC_ETERNAL_SLASH: { hitEffectId: 'eternal_slash/eternal_slash_hit/eternal_slash_hit' },
	SHC_SHADOW_STAB: { hitEffectId: 'shadow_stab/shadow_stab/shadow_stab' },
	SHC_IMPACT_CRATER: { hitEffectId: 'impact_crater/impact_crater_hit/impact_crater_hit' },
	SHC_FATAL_SHADOW_CROW: { hitEffectId: 'fatal_shadow_crow/fatal_shadow_crow_hit/fatal_shadow_crow_hit' },
	AG_DEADLY_PROJECTION: {
		beginCastEffectId: 'deadly_projection/deadly_projection_cast/deadly_projection_cast',
		hitEffectId: 'deadly_projection/deadly_projection_hit/deadly_projection_hit'
	},
	AG_DESTRUCTIVE_HURRICANE: {
		beginCastEffectId: 'destructive_hurricane/destructive_hurricane_cast/destructive_hurricane_cast',
		hitEffectId: 'destructive_hurricane/destructive_hurricane_hit/destructive_hurricane_hit'
	},
	AG_MYSTERY_ILLUSION: {
		beginCastEffectId: 'mystery_illusion/mystery_illusion_cast/mystery_illusion_cast',
		hitEffectId: 'mystery_illusion/mystery_illusion_hit/mystery_illusion_hit'
	},
	AG_VIOLENT_QUAKE: {
		beginCastEffectId: 'violentquake/violentquake_cast/violentquake_cast',
		hitEffectId: 'violentquake/violentquake_hit/violentquake_hit'
	},
	AG_SOUL_VC_STRIKE: { hitEffectId: 'soul_vc_strike/soul_vc_strike_hit/soul_vc_strike_hit' },
	AG_STRANTUM_TREMOR: { hitEffectId: 'strantumtremor/strantumtremor_hit/strantumtremor_hit' },
	AG_ALL_BLOOM: { hitEffectId: 'allbloom/allbloom_hit/allbloom_hit' },
	AG_CRYSTAL_IMPACT: { hitEffectId: 'crystal_impact/crystal_impact_hit/crystal_impact_hit' },
	AG_TORNADO_STORM: { hitEffectId: 'tornadostorm/tornadostorm_hit/tornadostorm_hit' },
	AG_ASTRAL_STRIKE: {
		beginCastEffectId: 'astralstrike/astralstrike_cast/astralstrike_cast',
		hitEffectId: 'astralstrike/astralstrike/astralstrike'
	},
	AG_CLIMAX: { effectId: 'climax/climax/climax' },
	AG_ROCK_DOWN: { hitEffectId: 'rockdown/rockdown_hit/rockdown_hit' },
	AG_STORM_CANNON: { hitEffectId: 'stormcannon/stormcannon/stormcannon' },
	AG_CRIMSON_ARROW: { hitEffectId: 'crimsonarrow/crimsonarrow_hit/crimsonarrow_hit' },
	AG_FROZEN_SLASH: { hitEffectId: 'frozen_slash/frozen_slash_hit/frozen_slash_hit' },
	CD_MEDIALE_VOTUM: { effectId: 'medialevotum/medialevotum/medialevotum' },
	CD_ARGUTUS_VITA: { effectId: 'argutusvita/argutusvita/argutusvita' },
	CD_ARGUTUS_TELUM: { effectId: 'argutustelum/argutustelum/argutustelum' },
	CD_ARBITRIUM: { hitEffectId: 'arbitrium/arbitrium_hit/arbitrium_hit' },
	CD_PRESENS_ACIES: { effectId: 'presensacies/presensacies/presensacies' },
	CD_EFFLIGO: { hitEffectId: 'effligo/effligo_hit/effligo_hit' },
	CD_COMPETENTIA: { effectId: 'competentia/competentia/competentia' },
	CD_PNEUMATICUS_PROCELLA: {
		beginCastEffectId: 'pneumaticusprocella/pneumaticusprocella_cast/pneumaticusprocella_cast'
	},
	CD_RELIGIO: { effectId: 'religio/religio/religio' },
	CD_BENEDICTUM: { effectId: 'benedictum/benedictum/benedictum' },
	CD_PETITIO: { hitEffectId: 'petitio/petitio/petitio' },
	WH_WIND_SIGN: { effectId: 'windsign/windsign/windsign' },
	WH_HAWKRUSH: { hitEffectId: 'hawkrush/hawkrush/hawkrush' },
	WH_GALESTORM: { hitEffectId: 'galestorm/galestorm_hit/galestorm_hit' },
	WH_CRESCIVE_BOLT: { hitEffectId: 'crescivebolt/crescivebolt_hit/crescivebolt_hit' },
	IG_GUARD_STANCE: { effectId: 'guard_stance/guard_stance/guard_stance' },
	IG_REBOUND_SHIELD: { effectId: 'rebound_shield/rebound_shield/rebound_shield' },
	IG_ATTACK_STANCE: { effectId: 'attack_stance/attack_stance/attack_stance' },
	IG_HOLY_SHIELD: { effectId: 'holy_shield/holy_shield/holy_shield' },
	IG_GRAND_JUDGEMENT: { hitEffectId: 'grand_judgement/grand_judgement/grand_judgement' },
	IG_JUDGEMENT_CROSS: { hitEffectId: 'judgement_cross/judgement_cross/judgement_cross' },
	IG_SHIELD_SHOOTING: { hitEffectId: 'shield_shooting/shield_shooting_hit/shield_shooting_hit' },
	IG_OVERSLASH: { hitEffectId: 'overslash/overslash_hit/overslash_hit' },
	BO_RESEARCHREPORT: { effectId: 'research_report/researchreport/researchreport' }
};

export const fourthJobSkillEffects = {};
export const fourthJobRenderEffects = {};
for (const [skill, stages] of Object.entries(fourthJobEffectResources)) {
	if (!Number.isInteger(SK[skill])) throw new Error(`Unknown fourth-job effect skill: ${skill}`);
	const mapping = {};
	for (const [stage, file] of Object.entries(stages)) {
		const key = `fourth:${skill}:${stage}`;
		mapping[stage] = key;
		fourthJobRenderEffects[key] = [{ type: 'STR', file, texturePath: file.slice(0, file.lastIndexOf('/') + 1) }];
	}
	fourthJobSkillEffects[SK[skill]] = mapping;
}
