import { afterEach, expect, it, vi } from 'vitest';
import { ownAttack, releaseAttack, clearAttackIntent, retryOwnedAttack } from '../../src/Controls/AttackIntent.js';
afterEach(clearAttackIntent);
it('ignores delayed failures after release and after switching targets', () => {
	const old = vi.fn(),
		next = vi.fn();
	ownAttack(1, old);
	expect(retryOwnedAttack(1)).toBe(true);
	expect(old).toHaveBeenCalledOnce();
	releaseAttack();
	expect(retryOwnedAttack(1)).toBe(true);
	expect(old).toHaveBeenCalledOnce();
	ownAttack(2, next);
	expect(retryOwnedAttack(1)).toBe(true);
	expect(next).not.toHaveBeenCalled();
	expect(retryOwnedAttack(2)).toBe(true);
	expect(next).toHaveBeenCalledOnce();
	expect(retryOwnedAttack(3)).toBe(false);
	clearAttackIntent();
	expect(retryOwnedAttack(1)).toBe(false);
});
