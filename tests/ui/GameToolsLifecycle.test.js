import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({ tabs: [], capabilities: {}, preferences: { tab: 'maps', save() {} } }));
vi.mock('UI/GUIComponent.js', () => ({
	default: class {
		constructor() {
			this._host = document.createElement('div');
			this._host.innerHTML = '<div class="tab-list"></div><div class="tab-content"></div>';
		}
		getRoot() {
			return this._host;
		}
		append() {
			this.__active = true;
		}
		focus() {}
	}
}));
vi.mock('UI/UIManager.js', () => ({ default: { addComponent: (value) => value } }));
vi.mock('Core/Preferences.js', () => ({ default: { get: () => fixtures.preferences } }));
vi.mock('../../src/UI/Components/GameTools/GameToolsRegistry.js', () => ({
	registerGameToolsTab: (tab) => fixtures.tabs.push(tab),
	getGameToolsTabs: () => fixtures.tabs
}));
vi.mock('../../src/UI/Components/GameTools/AdventureControlService.js', () => ({
	loadAdventureControlBootstrap: async () => fixtures.capabilities
}));
vi.mock('../../src/UI/Components/GameTools/MapCatalogTab.js', () => ({
	default: { id: 'maps', label: 'maps', mount: vi.fn(() => () => {}) }
}));
vi.mock('../../src/UI/Components/GameTools/NpcCatalogTab.js', () => ({
	default: { id: 'npcs', label: 'npcs', mount: vi.fn(() => () => {}) }
}));
vi.mock('../../src/UI/Components/GameTools/MonsterCatalogTab.js', () => ({
	default: { id: 'monsters', label: 'monsters', mount: vi.fn(() => () => {}) },
	notifyMonsterSpawnConfig: vi.fn(),
	notifyMonsterSpawnResult: vi.fn()
}));
vi.mock('../../src/UI/Components/GameTools/ItemCatalogTab.js', () => ({
	default: {
		id: 'items',
		label: 'items',
		capability: 'adminAvailable',
		mount: vi.fn((element, context) => {
			element.dataset.grant = String(context.capabilities.itemGrantAllowed);
			return () => {};
		})
	}
}));
vi.mock('../../src/UI/Components/GameTools/CharacterMaintenanceTab.js', () => ({
	default: {
		id: 'character',
		label: 'character',
		capability: 'characterMaintenanceAllowed',
		refreshOnOpen: true,
		mount: vi.fn(() => () => {})
	}
}));
vi.mock('../../src/UI/Components/GameTools/GameSettingsTab.js', () => ({
	default: {
		id: 'settings',
		label: 'settings',
		capability: 'gameSettingsAllowed',
		refreshOnOpen: true,
		mount: vi.fn(() => () => {})
	}
}));
import tools from '../../src/UI/Components/GameTools/GameTools.js';
const tab = (id) => fixtures.tabs.find((candidate) => candidate.id === id);
beforeEach(async () => {
	vi.clearAllMocks();
	fixtures.preferences.tab = 'maps';
	fixtures.capabilities = { itemGrantAllowed: false, characterMaintenanceAllowed: true, gameSettingsAllowed: true };
	tools.getRoot().querySelector('.tab-content').innerHTML = '';
	await tools.refreshCapabilities();
	tools.renderTabs();
});
describe('adventure window lifecycle', () => {
	it('updates permission dependent content when access is granted and revoked', async () => {
		tools.selectTab('items');
		expect(tools.getRoot().querySelector('.game-tools-tab').dataset.grant).toBe('false');
		fixtures.capabilities.itemGrantAllowed = true;
		await tools.refreshCapabilities();
		expect(tools.getRoot().querySelector('.game-tools-tab').dataset.grant).toBe('true');
		fixtures.capabilities.itemGrantAllowed = false;
		await tools.refreshCapabilities();
		expect(tools.getRoot().querySelector('.game-tools-tab').dataset.grant).toBe('false');
	});
	it('retains catalogs on reopening but reloads live forms', () => {
		tools.renderTabs({ reopening: true });
		expect(tab('maps').mount).toHaveBeenCalledTimes(1);
		for (const id of ['character', 'settings']) {
			tools.selectTab(id);
			tools.renderTabs({ reopening: true });
			expect(tab(id).mount).toHaveBeenCalledTimes(2);
		}
	});
});
