import SK from './SkillConst.js';
import StatusConst from '../Status/StatusConst.js';

// Explicit associations with STR assets in the deployed kRO resource set.
// Each nested STR uses textures relative to its own directory.
// Expanded-job effects are already loaded from ez2streffect.bson; do not
// duplicate those entries here, as that would play the same STR twice.
export const fourthJobEffectResources = {
	DK_SERVANTWEAPON: {
		beginCastEffectId: 'servantweapon/servantweapon_cast/servantweapon_cast'
	},
	DK_SERVANTWEAPON_ATK: {
		beforeHitEffectId: {
			files: [
				'servantweapon/servantweapon_shoot/servantweapon_shoot',
				'servantweapon/servantweapon_shoot_bottom/servantweapon_shoot_bottom'
			],
			travelsFromOther: true
		},
		hitEffectId: [
			'servantweapon/servantweapon_hit/servantweapon_hit',
			'servantweapon/servantweapon_hit_bottom/servantweapon_hit_bottom'
		]
	},
	DK_SERVANT_W_SIGN: { effectId: 'servant_sign/servant_sign_down/servant_sign_down' },
	DK_SERVANT_W_PHANTOM: { hitEffectId: 'servant_phantom/servant_phantom_hit/servant_phantom_hit' },
	DK_SERVANT_W_DEMOL: { hitEffectId: 'servant_demolition/servant_demolition_hit/servant_demolition_hit' },
	DK_CHARGINGPIERCE: { effectId: 'new_chargingpierce/new_chargingpierce_cast/new_chargingpierce_cast' },
	DK_HACKANDSLASHER: {
		effectId: 'hackandslash/hackandslash/hackandslash',
		hitEffectId: 'hackandslash/hackandslash_hit/hackandslash_hit'
	},
	// Secondary damage packets carry their own skill ID.
	DK_HACKANDSLASHER_ATK: { hitEffectId: 'hackandslash/hackandslash_hit/hackandslash_hit' },
	DK_DRAGONIC_AURA: { hitEffectId: 'dragonnic_ora/dragonnic_ora_hit/dragonnic_ora_hit' },
	DK_MADNESS_CRUSHER: { hitEffectId: 'madness_crusher/madness_crusher/madness_crusher' },
	DK_VIGOR: { effectId: 'vigor/vigor_cast/vigor_cast' },
	DK_STORMSLASH: { hitEffectId: 'stormslash/stormslash/stormslash_1' },
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
	SHC_POTENT_VENOM: { effectId: 'new_potent_venom/new_potent_venom' },
	SHC_ENCHANTING_SHADOW: {
		effectId: [
			'enchanting_shadow/enchanting_shadow/new_enchanting_shadow',
			'enchanting_shadow/enchanting_shadow_bottom/new_enchanting_shadow_bottom'
		]
	},
	MT_AXE_STOMP: {
		effectId: [
			'new_axe_stomp/new_axe_stomp/new_axe_stomp',
			'new_axe_stomp/new_axe_stomp_bottom/new_axe_stomp_bottom'
		],
		hitEffectId: 'new_axe_stomp/new_axe_stomp_hit/new_axe_stomp_hit'
	},
	MT_RUSH_QUAKE: {
		effectId: [
			'new_rush_quake/new_rush_quake/new_rush_quake',
			'new_rush_quake/new_rush_quake_bottom/new_rush_quake'
		],
		hitEffectId: 'new_rush_quake/new_rush_quake_hit/new_rush_quake_hit'
	},
	MT_D_MACHINE: {
		beginCastEffectId: [
			'new_d_machine/new_d_machine_cast/new_d_machine_cast',
			'new_d_machine/new_d_machine_cast_bottom/new_d_machine_cast_bottom'
		],
		effectId: 'new_d_machine/new_d_machine/new_d_machine'
	},
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
	AG_RAIN_OF_CRYSTAL: {
		beginCastEffectId: [
			'rain_of_crystal/rain_of_crystal_casting/rain_of_crystal_casting',
			'rain_of_crystal/rain_of_crystal_casting_bottom/rain_of_crystal_casting_bottom'
		]
	},
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
	CD_REPARATIO: {
		beginCastEffectId: [
			'new_reparatio/new_reparatio_cast/new_reparatio_cast',
			'new_reparatio/new_reparatio_cast_bottom/new_reparatio_cast_bottom'
		],
		effectId: [
			'new_reparatio/new_reparatio_target/new_reparatio_target',
			'new_reparatio/new_reparatio_target_bottom/new_reparatio_target_bottom'
		]
	},
	WH_WIND_SIGN: { effectId: 'windsign/windsign/windsign' },
	WH_HAWKRUSH: { hitEffectId: 'hawkrush/hawkrush/hawkrush' },
	WH_GALESTORM: {
		beginCastEffectId: 'galestorm/galestorm_cast/galestorm_cast',
		effectId: 'galestorm/galestorm/galestorm',
		beforeHitEffectId: { files: 'galestorm/galestorm_arrow/galestorm_arrow', travelsFromOther: true },
		hitEffectId: 'galestorm/galestorm_hit/galestorm_hit'
	},
	WH_CRESCIVE_BOLT: {
		beginCastEffectId: 'crescivebolt/crescivebolt_cast/crescivebolt_cast',
		beforeHitEffectId: { files: 'crescivebolt/crescivebolt/crescivebolt', travelsFromOther: true },
		hitEffectId: 'crescivebolt/crescivebolt_hit/crescivebolt_hit'
	},
	WH_DEEPBLINDTRAP: {
		beginCastEffectId: 'deepblindtrap/deepblindtrap_cast/deepblindtrap_cast',
		hitEffectId: 'deepblindtrap/deepblindtrap_hit/deepblindtrap_hit'
	},
	WH_SOLIDTRAP: {
		beginCastEffectId: 'solidtrap/solidtrap_cast/solidtrap_cast',
		hitEffectId: 'solidtrap/solidtrap_hit/solidtrap_hit'
	},
	WH_SWIFTTRAP: {
		beginCastEffectId: 'swifttrap/swifttrap_cast/swifttrap_cast',
		hitEffectId: 'swifttrap/swifttrap_hit/swifttrap_hit'
	},
	WH_FLAMETRAP: {
		beginCastEffectId: 'flametrap/flametrap_cast/flametrap_cast',
		hitEffectId: 'flametrap/flametrap_hit/flametrap_hit'
	},
	IG_GUARD_STANCE: { effectId: 'guard_stance/guard_stance/guard_stance' },
	IG_REBOUND_SHIELD: { effectId: 'rebound_shield/rebound_shield/rebound_shield' },
	IG_ATTACK_STANCE: { effectId: 'attack_stance/attack_stance/attack_stance' },
	IG_HOLY_SHIELD: { effectId: 'holy_shield/holy_shield/holy_shield' },
	IG_GRAND_JUDGEMENT: { hitEffectId: 'grand_judgement/grand_judgement/grand_judgement' },
	IG_JUDGEMENT_CROSS: { hitEffectId: 'judgement_cross/judgement_cross/judgement_cross' },
	IG_SHIELD_SHOOTING: { hitEffectId: 'shield_shooting/shield_shooting_hit/shield_shooting_hit' },
	IG_OVERSLASH: { hitEffectId: 'overslash/overslash_hit/overslash_hit' },
	IG_CROSS_RAIN: {
		beginCastEffectId: [
			'crossrain/cross_rain_cast/cross_rain_cast',
			'crossrain/cross_rain_cast_bottom/cross_rain_cast_bottom'
		]
	},
	IG_ULTIMATE_SACRIFICE: {
		effectId: [
			'ultimate_sacrifice/ultimatesacrifice/ultimatesacrifice',
			'ultimate_sacrifice/ultimatesacrifice_bottom/ultimatesacrifice_bottom',
			'ultimate_sacrifice/ultimatesacrifice_shine/ultimatesacrifice_shine'
		]
	},
	ABC_ABYSS_DAGGER: {
		effectId: 'abyss_dagger/abyss_dagger/abyss_dagger',
		hitEffectId: 'abyss_dagger/abyss_dagger_hit/abyss_dagger_hit'
	},
	ABC_UNLUCKY_RUSH: {
		effectId: 'unlucky_rush/unlucky_rush_cast/unlucky_rush_cast',
		hitEffectId: 'unlucky_rush/unlucky_rush_hit/unlucky_rush_hit'
	},
	ABC_CHAIN_REACTION_SHOT: {
		beginCastEffectId: [
			'chain_reaction_shot/chain_reaction_shot_cast/chain_reaction_shot_cast',
			'chain_reaction_shot/chain_reaction_shot_cast_bottom/chain_reaction_shot_cast_bottom'
		],
		beforeHitEffectId: 'chain_reaction_shot/chain_reaction_shot/chain_reaction_shot',
		hitEffectId: 'chain_reaction_shot/chain_reaction_shot_hit/chain_reaction_shot_hit'
	},
	ABC_CHAIN_REACTION_SHOT_ATK: {
		hitEffectId: 'chain_reaction_shot/chain_reaction_shot_hitsub/chain_reaction_shot_hitsub'
	},
	ABC_FROM_THE_ABYSS: {
		effectId: 'from_the_abyss/from_the_abyss_shadowball_create/from_the_abyss_shadowball_create'
	},
	ABC_FROM_THE_ABYSS_ATK: { hitEffectId: 'from_the_abyss/from_the_abyss_attack/from_the_abyss_attack' },
	ABC_ABYSS_SLAYER: {
		beginCastEffectId: [
			'4abc_abyss_slayer/abyss_slayer_cast/abyss_slayer_cast',
			'4abc_abyss_slayer/abyss_slayer_cast_bottom/abyss_slayer_cast_bottom'
		],
		effectId: '4abc_abyss_slayer/abyss_slayer/abyss_slayer'
	},
	ABC_ABYSS_STRIKE: {
		beginCastEffectId: [
			'abyss_strike/abyss_strike_cast/abyss_strike_cast',
			'abyss_strike/abyss_strike_cast_bottom/abyss_strike_cast_bottom'
		],
		effectId: [
			'abyss_strike/abyss_strike/abyss_strike',
			'abyss_strike/abyss_strike_bottom/abyss_strike_bottom',
			'abyss_strike/abyss_strike_ground/abyss_strike_ground',
			'abyss_strike/abyss_strike_ground_bottom/abyss_strike_ground_bottom'
		],
		hitEffectId: 'abyss_strike/abyss_strike_hit/abyss_strike_hit'
	},
	ABC_DEFT_STAB: { hitEffectId: 'deft_stab/deft_stab/deft_stab' },
	ABC_ABYSS_SQUARE: { hitEffectId: 'abyss_square/abyss_square_hit/abyss_square_hit' },
	ABC_FRENZY_SHOT: {
		beforeHitEffectId: 'frenzy_shot/frenzy_shot/frenzy_shot',
		hitEffectId: 'frenzy_shot/frenzy_shot_hit/frenzy_shot_hit'
	},
	BO_ACIDIFIED_ZONE_WATER: {
		beginCastEffectId: [
			'acidified_zone_water/acidified_zone_water_cast/acidified_zone_water_cast',
			'acidified_zone_water/acidified_zone_water_cast_bottom/acidified_zone_water_cast_bottom'
		],
		hitEffectId: 'acidified_zone_water/acidified_zone_water_hit/acidified_zone_water_hit'
	},
	BO_ACIDIFIED_ZONE_GROUND: {
		beginCastEffectId: [
			'acidified_zone_ground/acidified_zone_ground_cast/acidified_zone_ground_cast',
			'acidified_zone_ground/acidified_zone_ground_cast_bottom/acidified_zone_ground_cast_bottom'
		],
		hitEffectId: 'acidified_zone_ground/acidified_zone_ground_hit/acidified_zone_ground_hit'
	},
	BO_ACIDIFIED_ZONE_WIND: {
		beginCastEffectId: [
			'acidified_zone_wind/acidified_zone_wind_cast/acidified_zone_wind_cast',
			'acidified_zone_wind/acidified_zone_wind_cast_bottom/acidified_zone_wind_cast_bottom'
		],
		hitEffectId: 'acidified_zone_wind/acidified_zone_wind_hit/acidified_zone_wind_hit'
	},
	BO_ACIDIFIED_ZONE_FIRE: {
		beginCastEffectId: [
			'acidified_zone_fire/acidified_zone_fire_cast/acidified_zone_fire_cast',
			'acidified_zone_fire/acidified_zone_fire_cast_bottom/acidified_zone_fire_cast_bottom'
		],
		hitEffectId: 'acidified_zone_fire/acidified_zone_fire_hit/acidified_zone_fire_hit'
	},
	BO_RESEARCHREPORT: { effectId: 'research_report/researchreport/researchreport' },
	BO_WOODEN_FAIRY: {
		beginCastEffectId: [
			'wooden_fairy/wooden_cast/wooden_cast',
			'wooden_fairy/wooden_cast_bottom/wooden_cast_bottom'
		],
		effectId: 'wooden_fairy/fairy_dusty/fairy_dusty'
	},
	BO_HELLTREE: {
		beginCastEffectId: [
			'helltree/helltree_cast/helltree_cast',
			'helltree/helltree_cast_bottom/helltree_cast_bottom'
		],
		effectId: 'helltree/hell_dusty/hell_dusty'
	},
	EM_SPELL_ENCHANTING: { effectId: 'spell_enchanting/spell_enchanting/spell_enchanting' },
	EM_INCREASING_ACTIVITY: {
		beginCastEffectId: [
			'increasing_activity/increasing_activity_cast/increasing_activity_cast',
			'increasing_activity/increasing_activity_cast_bottom/increasing_activity_cast_bottom'
		],
		effectId: 'increasing_activity/increasing_activity/increasing_activity'
	},
	EM_ACTIVITY_BURN: {
		beginCastEffectId: [
			'activity_burn/activity_burn_cast/activity_burn_cast',
			'activity_burn/activity_burn_cast_bottom/activity_burn_cast_bottom'
		],
		effectId: 'activity_burn/activity_burn/activity_burn'
	},
	EM_DIAMOND_STORM: {
		beginCastEffectId: [
			'diamond_storm/diamond_storm_cast/diamond_storm_cast',
			'diamond_storm/diamond_storm_cast_bottom/diamond_storm_cast_bottom'
		],
		effectId: [
			'diamond_storm/diamond_storm/diamond_storm',
			'diamond_storm/diamond_storm_bottom/diamond_storm_bottom'
		],
		hitEffectId: 'diamond_storm/diamond_storm_hit/diamond_storm_hit'
	},
	EM_LIGHTNING_LAND: {
		beginCastEffectId: [
			'lightning_land/lightning_land_cast/lightning_land_cast',
			'lightning_land/lightning_land_cast_bottom/lightning_land_cast_bottom'
		],
		hitEffectId: 'lightning_land/lightning_land_hit/lightning_land_hit'
	},
	EM_VENOM_SWAMP: {
		beginCastEffectId: [
			'venom_swamp/venom_swamp_cast/venom_swamp_cast',
			'venom_swamp/venom_swamp_cast_bottom/venom_swamp_cast_bottom'
		],
		hitEffectId: 'venom_swamp/venom_swamp_hit/venom_swamp_hit'
	},
	EM_CONFLAGRATION: {
		beginCastEffectId: [
			'conflagration/conflagration_cast/conflagration_cast',
			'conflagration/conflagration_cast_bottom/conflagration_cast_bottom'
		],
		hitEffectId: 'conflagration/conflagration_hit/conflagration_hit'
	},
	EM_ELEMENTAL_BUSTER: { beginCastEffectId: 'elemental_buster/elemental_buster_cast/elemental_buster_cast' },
	EM_ELEMENTAL_BUSTER_FIRE: {
		effectId: [
			'elemental_buster/elemental_buster/elemental_buster_fire/elemental_buster_fire',
			'elemental_buster/elemental_buster/elemental_buster_fire_bottom/elemental_buster_fire_bottom'
		],
		hitEffectId: 'elemental_buster/elemental_buster_hit/elemental_buster_fire_hit/elemental_buster_fire_hit'
	},
	EM_ELEMENTAL_BUSTER_WATER: {
		effectId: [
			'elemental_buster/elemental_buster/elemental_buster_water/elemental_buster_water',
			'elemental_buster/elemental_buster/elemental_buster_water_bottom/elemental_buster_water_bottom'
		],
		hitEffectId: 'elemental_buster/elemental_buster_hit/elemental_buster_water_hit/elemental_buster_water_hit'
	},
	EM_ELEMENTAL_BUSTER_WIND: {
		effectId: [
			'elemental_buster/elemental_buster/elemental_buster_wind/elemental_buster_wind',
			'elemental_buster/elemental_buster/elemental_buster_wind_bottom/elemental_buster_wind_bottom'
		],
		hitEffectId: 'elemental_buster/elemental_buster_hit/elemental_buster_wind_hit/elemental_buster_wind_hit'
	},
	EM_ELEMENTAL_BUSTER_GROUND: {
		effectId: [
			'elemental_buster/elemental_buster/elemental_buster_land/elemental_buster_land',
			'elemental_buster/elemental_buster/elemental_buster_land_bottom/elemental_buster_land_bottom'
		],
		hitEffectId: 'elemental_buster/elemental_buster_hit/elemental_buster_land_hit/elemental_buster_land_hit'
	},
	EM_ELEMENTAL_BUSTER_POISON: {
		effectId: [
			'elemental_buster/elemental_buster/elemental_buster_poison/elemental_buster_poison',
			'elemental_buster/elemental_buster/elemental_buster_poison_bottom/elemental_buster_poison_bottom'
		],
		hitEffectId: 'elemental_buster/elemental_buster_hit/elemental_buster_poison_hit/elemental_buster_poison_hit'
	},
	IQ_JUDGE: {
		effectId: ['4ig_judge/judge_start/judge_start', '4ig_judge/judge/judge', '4ig_judge/judge_aura/judge_aura']
	},
	TR_ROSEBLOSSOM: {
		beginCastEffectId: [
			'roseblossom/roseblossom_cast/roseblossom_cast',
			'roseblossom/roseblossom_cast_bottom/roseblossom_cast_bottom'
		],
		beforeHitEffectId: 'roseblossom/roseblossom_shot/roseblossom_shot',
		hitEffectId: 'roseblossom/roseblossom_hit/roseblossom_hit'
	},
	TR_ROSEBLOSSOM_ATK: { hitEffectId: 'roseblossom/roseblossom_rose/roseblossom_rose' },
	TR_RHYTHMSHOOTING: {
		beginCastEffectId: [
			'rhythmshooting/rhythmshooting_cast/rhythmshooting_cast',
			'rhythmshooting/rhythmshooting_cast_bottom/rhythmshooting_cast_bottom'
		],
		beforeHitEffectId: 'rhythmshooting/rhythmshooting_shot/rhythmshooting_shot',
		hitEffectId: 'rhythmshooting/rhythmshooting_hit/rhythmshooting_hit'
	},
	TR_SOUNDBLEND: {
		beginCastEffectId: [
			'soundblend/soundblend_cast/soundblend_cast',
			'soundblend/soundblend_cast_bottom/soundblend_cast_bottom'
		],
		effectId: ['soundblend/soundblend/soundblend', 'soundblend/soundblend_red/soundblend_red']
	},
	TR_AIN_RHAPSODY: {
		beginCastEffectId: 'ain_rhapsody/ain_rhapsody_cast/ain_rhapsody_cast',
		effectId: 'ain_rhapsody/ain_rhapsody/ain_rhapsody'
	},
	TR_GEF_NOCTURN: {
		beginCastEffectId: [
			'gef_nocturn/gef_nocturn_cast/gef_nocturn_cast',
			'gef_nocturn/gef_nocturn_cast_bottom/gef_nocturn_cast_bottom'
		],
		effectId: 'gef_nocturn/gef_nocturn/gef_nocturn'
	},
	TR_ROKI_CAPRICCIO: {
		beginCastEffectId: [
			'roki_capriccio/roki_capriccio_cast/roki_capriccio_cast',
			'roki_capriccio/roki_capriccio_cast_bottom/roki_capriccio_cast_bottom'
		],
		effectId: 'roki_capriccio/roki_capriccio/roki_capriccio'
	},
	TR_MUSICAL_INTERLUDE: {
		beginCastEffectId: 'musical_interlude/musical_interlude_cast/musical_interlude_cast',
		effectId: 'musical_interlude/musical_interlude/musical_interlude'
	},
	TR_JAWAII_SERENADE: {
		beginCastEffectId: [
			'jawaii_serenade/jawaii_serenade_cast/jawaii_serenade_cast',
			'jawaii_serenade/jawaii_serenade_cast_bottom/jawaii_serenade_cast_bottom'
		],
		effectId: 'jawaii_serenade/jawaii_serenade/jawaii_serenade'
	},
	HN_JUPITEL_THUNDER_STORM: {
		beforeHitEffectId:
			'hyper_novice/hn_jupitel_thunder_storm/jupitel_thunder_storm_ball/jupitel_thunder_storm_ball',
		hitEffectId: [
			'hyper_novice/hn_jupitel_thunder_storm/jupitel_thunder_storm/jupitel_thunder_storm_00',
			'hyper_novice/hn_jupitel_thunder_storm/jupitel_thunder_storm/jupitel_thunder_storm_01',
			'hyper_novice/hn_jupitel_thunder_storm/jupitel_thunder_storm/jupitel_thunder_storm_02'
		]
	},
	MT_SUMMON_ABR_BATTLE_WARIOR: {
		beginCastEffectId: 'new_battle_w/new_battle_w_cast/new_battle_w_cast',
		effectId: ['new_battle_w/new_battle_w/new_battle_w', 'new_battle_w/new_battle_w_bottom/new_battle_w_bottom']
	}
};

export const fourthJobStatusEffectResources = {
	[StatusConst.SERVANTWEAPON]: {
		name: 'SERVANTWEAPON',
		files: 'servantweapon/servantweapon/servantweapon',
		attachedEntity: true,
		repeat: true
	}
};

export const fourthJobSkillEffects = {};
export const fourthJobRenderEffects = {};
export const fourthJobStatusEffects = {};

function registerEffect(key, resources) {
	const descriptor = typeof resources === 'object' && !Array.isArray(resources) ? resources : { files: resources };
	const { files, ...semantics } = descriptor;
	delete semantics.name;
	fourthJobRenderEffects[key] = [files].flat().map(file => ({
		type: 'STR',
		file,
		texturePath: file.slice(0, file.lastIndexOf('/') + 1),
		...semantics
	}));
}

for (const [skill, stages] of Object.entries(fourthJobEffectResources)) {
	if (!Number.isInteger(SK[skill])) throw new Error(`Unknown fourth-job effect skill: ${skill}`);
	const mapping = {};
	for (const [stage, resources] of Object.entries(stages)) {
		const key = `fourth:${skill}:${stage}`;
		mapping[stage] = key;
		registerEffect(key, resources);
	}
	fourthJobSkillEffects[SK[skill]] = mapping;
}

for (const [status, resources] of Object.entries(fourthJobStatusEffectResources)) {
	const key = `fourth:status:${resources.name}`;
	fourthJobStatusEffects[status] = key;
	registerEffect(key, resources);
}
