import { afterEach, expect, it, vi } from 'vitest';
vi.mock('DB/DBManager.js', () => ({ default: { getMapInfo: () => ({ displayName: '普隆德拉' }) } }));
vi.mock('../../src/UI/Components/GameTools/AdventureControlService.js', () => ({ loadCurrentCharacter: vi.fn(), maintainCurrentCharacter: vi.fn() }));
vi.mock('../../src/UI/Components/GameTools/GameToolsConfirm.js', () => ({ requestGameToolsConfirmation: vi.fn().mockResolvedValue(true) }));
import { loadCurrentCharacter, maintainCurrentCharacter } from '../../src/UI/Components/GameTools/AdventureControlService.js';
import tab from '../../src/UI/Components/GameTools/CharacterMaintenanceTab.js';

const traits = { enabled: true, points: 7, budget: 7,
	values: {pow: 0, sta: 0, wis: 0, spl: 0, con: 0, crt: 0},
	maximums: {pow: 110, sta: 110, wis: 110, spl: 110, con: 110, crt: 110} };
const snapshot = { job_id: 4060, name: '四转测试', map: 'prontera', x: 1, y: 1, hp: 50, max_hp: 50, sp: 10, max_sp: 10,
	base_level: 200, job_level: 70, skill_points: 0, status_points: 0, max_base_level: 200, max_job_level: 70,
	max_skill_points: 32767, str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1, max_stat: 32767,
	traits: {...traits, enabled: false}, jobs: [
		{id: 4060, max_base_level: 200, max_job_level: 70, traits: false},
		{id: 4252, max_base_level: 275, max_job_level: 60, traits: true},
		{id: 4302, max_base_level: 275, max_job_level: 60, traits: true}
	] };
afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });

it('uses server job capabilities and submits target-job levels above the old maximum', async () => {
	loadCurrentCharacter.mockResolvedValue(snapshot);
	maintainCurrentCharacter.mockResolvedValue({...snapshot, job_id: 4252, base_level: 250, job_level: 1,
		max_base_level: 275, max_job_level: 60, traits});
	document.body.innerHTML = '<div id="test"></div>';
	const root = document.getElementById('test');
	tab.mount(root);
	await vi.waitFor(() => expect(root.querySelector('[data-job-id="4252"]')).not.toBeNull());
	expect(root.querySelector('[data-job-id="4252"]').textContent).toContain('龙骑士');
	expect(root.querySelector('[data-job-id="4280"]')).toBeNull();
	root.querySelector('[data-job-id="4252"]').click();
	const target = root.querySelector('[data-form="job-target"] input');
	expect(target.max).toBe('275');
	target.value = '250';
	root.querySelector('[data-action="apply-job"]').click();
	await vi.waitFor(() => expect(maintainCurrentCharacter).toHaveBeenCalledWith('character.progression.update', {job_id: 4252, base_level: 250}));
	await vi.waitFor(() => expect(root.querySelector('[data-form="traits"]')).not.toBeNull());
	expect(root.querySelector('[data-form="progression"] [name="base_level"]').max).toBe('275');
	expect(root.querySelector('[data-form="progression"] [name="job_level"]').max).toBe('60');
});

it('submits only changed traits and keeps trait reset separate from base stats', async () => {
	loadCurrentCharacter.mockResolvedValue({...snapshot, job_id: 4252, traits});
	maintainCurrentCharacter.mockResolvedValue({...snapshot, job_id: 4252, traits: {...traits, points: 0, values: {...traits.values, pow: 7}}});
	document.body.innerHTML = '<div id="test"></div>';
	const root = document.getElementById('test');
	tab.mount(root);
	await vi.waitFor(() => expect(root.querySelector('[name="pow"]')).not.toBeNull());
	root.querySelector('[name="pow"]').value = '7';
	root.querySelector('[data-form="traits"]').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
	await vi.waitFor(() => expect(maintainCurrentCharacter).toHaveBeenCalledWith('character.traits.update', {pow: 7}));
	await vi.waitFor(() => expect(root.querySelector('[data-action="traits-reset"]').disabled).toBe(false));
	root.querySelector('[data-action="traits-reset"]').click();
	await vi.waitFor(() => expect(maintainCurrentCharacter).toHaveBeenLastCalledWith('character.traits.reset', {}));
});
