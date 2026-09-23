/** Shared entity-category validation, independent of mouse or touch input. */
export function canTargetSkill(entity, flag, { self, override = false, canAttack = () => false } = {}) {
	if (!entity) return false;
	const T = entity.constructor;
	let mask = 0;
	switch (entity.objecttype) {
		case T.TYPE_MOB:
		case T.TYPE_UNIT:
			mask = 1 | 64;
			break;
		case T.TYPE_TRAP:
			mask = 32;
			break;
		case T.TYPE_HOM:
		case T.TYPE_MERC:
			mask = 128 | 16;
			break;
		case T.TYPE_PC:
		case T.TYPE_ELEM:
			mask = 16;
			break;
		default:
			return false;
	}
	if (!(mask & flag) && !override && !canAttack(entity)) return false;
	return !(flag & 1 && entity === self);
}
