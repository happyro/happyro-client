/**
 * Map PACKET.ZC.ACK_TOUSESKILL failures to msgstringtable ids.
 *
 * Unmapped causes still get a visible error so cooldown / rebound rejects
 * are never silent.
 */

const NV_BASIC = 1;
const AL_WARP = 27;
const TF_STEAL = 50;
const TF_POISON = 52;
const CG_TAROTCARD = 396;

const GENERIC_SKILL_FAIL = 204;

export function skillFailMessageId(pkt) {
	if (!pkt || pkt.result) {
		return 0;
	}

	let error = 0;

	if (pkt.NUM) {
		switch (pkt.SKID) {
			default:
				error = GENERIC_SKILL_FAIL;
				break;
			case NV_BASIC:
				error = pkt.NUM < 7 ? 159 + pkt.NUM : pkt.NUM == 7 ? 383 : 0;
				break;
			case AL_WARP:
				error = 214;
				break;
			case TF_STEAL:
				error = 205;
				break;
			case TF_POISON:
				error = 207;
				break;
		}
	}

	if (pkt.SKID == CG_TAROTCARD) {
		error = GENERIC_SKILL_FAIL;
	} else {
		switch (pkt.cause) {
			case 1:
				error = 202;
				break;
			case 2:
				error = 203;
				break;
			case 3:
				error = 808;
				break;
			case 4:
				error = 219;
				break;
			case 5:
				error = 233;
				break;
			case 6:
				error = 239;
				break;
			case 7:
				error = 246;
				break;
			case 8:
				error = 247;
				break;
			case 9:
				error = 580;
				break;
			case 10:
				error = 285;
				break;
			case 13:
				error = 1398;
				break;
			case 83:
				error = 661;
				break;
		}
	}

	return error || GENERIC_SKILL_FAIL;
}

export const SKILL_FAIL_WAIT_MESSAGE_ID = 219;
