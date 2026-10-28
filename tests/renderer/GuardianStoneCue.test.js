import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('guardian stone red cue', () => {
	it('provides a visible finite effect for the server volcano notification', () => {
		const source = readFileSync('src/DB/Effects/EffectTable.js', 'utf8');
		const block = source.match(/\n\t225: (\[[\s\S]*?\n\t\]),/)[1];
		const effects = new Function(`return (${block});`)();
		expect(effects.length).toBeGreaterThan(0);
		for (const effect of effects) {
			expect(effect.type).toBe('CYLINDER');
			expect(effect.textureName).toBe('ring_red');
			expect(effect.attachedEntity).toBe(true);
			expect(effect.red).toBeGreaterThan(effect.green);
			expect(effect.red).toBeGreaterThan(effect.blue);
			expect(effect.alphaMax).toBeGreaterThan(0);
			expect(effect.duration).toBeGreaterThan(0);
			expect(effect.duration).toBeLessThanOrEqual(2000);
		}
	});
});
