import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../..');
const read = path => readFileSync(resolve(projectRoot, path), 'utf8');

describe('game tools integration', () => {
	it('ships the verified monster catalog and every referenced atlas', () => {
		const catalog = JSON.parse(read('applications/pwa/data/monsters/catalog.json'));
		const ids = new Set(catalog.monsters.map(monster => monster.id));
		const poring = catalog.monsters.find(monster => monster.id === 1002);

		expect(catalog.schema).toBe('happyro-monster-catalog/v1');
		expect(catalog.source.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.itemsSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.monsters).toHaveLength(2675);
		expect(ids.size).toBe(catalog.monsters.length);
		expect(poring).toMatchObject({ name: '波利', nameEn: 'Poring', atlas: 0 });
		expect(poring.drops[0]).toMatchObject({
			Item: 'Jellopy',
			itemId: 909,
			name: '杰勒比结晶',
			nameEn: 'Jellopy'
		});

		const drops = catalog.monsters.flatMap(monster => [...monster.drops, ...monster.mvpDrops]);
		expect(drops).toHaveLength(13339);
		expect(drops.every(drop => drop.itemId > 0 && drop.name && drop.nameEn)).toBe(true);

		for (const atlas of new Set(catalog.monsters.map(monster => monster.atlas).filter(Number.isInteger))) {
			expect(existsSync(resolve(projectRoot, `applications/pwa/data/monsters/atlas-${atlas}.webp`))).toBe(true);
		}
	});

	it('wires both active toolbar versions and the private packet pair', () => {
		expect(read('src/UI/Components/BasicInfo/BasicInfoV4/BasicInfoV4.html')).toContain('id="game-tools"');
		expect(read('src/UI/Components/BasicInfo/BasicInfoV5/BasicInfoV5.html')).toContain('id="game-tools"');
		expect(read('src/Network/PacketStructure.js')).toContain('pkt_buf.writeShort(0xcfe)');
		expect(read('src/Network/PacketRegister.js')).toContain('0xcff: PACKET.ZC.HAPPYRO_MONSTER_SPAWN_RESULT');
	});

	it('copies catalog assets into the deployed PWA output', () => {
		expect(read('applications/tools/builder-web.mjs')).toContain(
			"copyFolder('./applications/pwa/data', dist + platform + '/data')"
		);
		expect(JSON.parse(read('package.json')).scripts['build:online']).toContain('--PWA');
	});

	it('keeps monster details behind a fixed bottom action area', () => {
		const css = read('src/UI/Components/GameTools/GameTools.css');

		expect(css).toMatch(/\.monster-detail\s*\{[^}]*overflow:\s*hidden/s);
		expect(css).toMatch(/\.monster-drops\s*\{[^}]*overflow-y:\s*auto/s);
		expect(css).toMatch(/\.summon-panel\s*\{[^}]*margin:\s*0 -12px -12px/s);
		expect(css).not.toMatch(/\.summon-panel\s*\{[^}]*position:\s*sticky/s);
	});

	it('renders localized drop names while retaining source names as metadata', () => {
		const source = read('src/UI/Components/GameTools/MonsterCatalogTab.js');

		expect(source).toContain('escapeHtml(drop.name || drop.Item)');
		expect(source).toContain('title="${escapeHtml(drop.nameEn || drop.Item)}"');
	});
});
