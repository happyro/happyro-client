import { afterEach, expect, it, vi } from 'vitest';
vi.mock('DB/Jobs/JobDisplayNameTable.js', () => ({ default: { 0: '初心者', 1: '剑士' }, getJobDisplayName: id => id === 1 ? '剑士' : '初心者' }));
vi.mock('DB/DBManager.js', () => ({ default: { getMapInfo: () => ({ displayName: '普隆德拉' }) } }));
vi.mock('../../src/UI/Components/GameTools/AdventureControlService.js', () => ({ loadCurrentCharacter: vi.fn(), maintainCurrentCharacter: vi.fn() }));
vi.mock('../../src/UI/Components/GameTools/GameToolsConfirm.js', () => ({ requestGameToolsConfirmation: vi.fn().mockResolvedValue(true) }));
import { loadCurrentCharacter, maintainCurrentCharacter } from '../../src/UI/Components/GameTools/AdventureControlService.js';
import tab from '../../src/UI/Components/GameTools/CharacterMaintenanceTab.js';
afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });
it('keeps the window open after changing jobs and shows failures beside actions', async () => {
	const snapshot = { job_id: 0, name: '测试角色', map: 'prontera', x: 1, y: 1, hp: 50, max_hp: 50, sp: 10, max_sp: 10,
		base_level: 1, job_level: 1, skill_points: 0, status_points: 0, max_base_level: 200, max_job_level: 50, max_skill_points: 1000,
		str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1, max_stat: 130,
		traits: { enabled: false }, jobs: [{id: 0, max_base_level: 99, max_job_level: 10}, {id: 1, max_base_level: 99, max_job_level: 50}] };
	loadCurrentCharacter.mockResolvedValue(snapshot);
	maintainCurrentCharacter.mockResolvedValue({ ...snapshot, job_id: 1 });
	document.body.innerHTML = '<div class="game-tools-window"><div class="tab"></div></div>';
	const root = document.querySelector('.game-tools-window');
	const close = vi.fn();
	tab.mount(root.firstElementChild, { close });
	await vi.waitFor(() => expect(root.querySelector('[data-job-id="1"]')).not.toBeNull());
	root.querySelector('[data-job-id="1"]').click();
	root.querySelector('[data-action="apply-job"]').click();
	await vi.waitFor(() => expect(root.querySelector('.game-tools-toast.success')?.textContent).toContain('已转职为剑士'));
	expect(close).not.toHaveBeenCalled();
	expect(root.querySelector('.character-summary').textContent).toContain('剑士');
	expect(root.querySelector('[data-action="apply-job"]').disabled).toBe(true);
	maintainCurrentCharacter.mockRejectedValue(new Error('服务暂时不可用'));
	root.querySelector('[data-action="vitals"]').click();
	await vi.waitFor(() => expect(root.querySelector('.management-status.error')?.textContent).toBe('服务暂时不可用'));
	expect(root.querySelector('.game-tools-toast')).toBeNull();
});
