import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { skillFailMessageId } from '../../src/Engine/MapEngine/SkillFail.js';

describe('skill fail ACK', () => {
	it('maps cooldown interval failures to a visible wait message', () => {
		expect(skillFailMessageId({ result: 0, SKID: 5014, NUM: 0, cause: 4 })).toBe(219);
	});

	it('still shows a generic failure when the cause is unmapped', () => {
		expect(skillFailMessageId({ result: 0, SKID: 5014, NUM: 0, cause: 23 })).toBe(204);
	});

	it('does not report a message on success', () => {
		expect(skillFailMessageId({ result: 1, SKID: 5014, NUM: 0, cause: 0 })).toBe(0);
	});

	it('is used by the map skill ACK handler', () => {
		const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
		const skillEngine = readFileSync(resolve(src, 'Engine/MapEngine/Skill.js'), 'utf8');
		const shortcut = readFileSync(resolve(src, 'UI/Components/ShortCut/ShortCut.js'), 'utf8');
		expect(skillEngine).toContain("from './SkillFail.js'");
		expect(skillEngine).toContain('skillFailMessageId(pkt)');
		expect(shortcut).toContain('remainingCooldown');
		expect(shortcut).toContain('setSkillCooldown(ID, delay)');
	});

	it('does not suppress cooldown fail packets on the server', () => {
		const conf = readFileSync(
			resolve(dirname(fileURLToPath(import.meta.url)), '../../../happyro-server/conf/battle/skill.conf'),
			'utf8'
		);
		expect(conf).toMatch(/^display_skill_fail:\s*0\s*$/m);
	});
});
