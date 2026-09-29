// Track requests owned by shared combat commands so delayed server failures cannot
// restart a released attack. Unowned manual requests retain their existing path.
const requested = new Set();
let retry;
export function ownAttack(gid, callback) {
	requested.add(gid);
	retry = { gid, callback };
}
export function releaseAttack() {
	retry = null;
}
export function clearAttackIntent() {
	requested.clear();
	retry = null;
}
export function retryOwnedAttack(gid) {
	if (!requested.has(gid)) return false;
	if (retry?.gid === gid) retry.callback();
	return true;
}
