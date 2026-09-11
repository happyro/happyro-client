import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import NpcInstanceNameTable from '../../src/DB/Navigation/NpcInstanceNameTable.js';

const projectRoot = resolve(import.meta.dirname, '../..');
const read = path => readFileSync(resolve(projectRoot, path), 'utf8');

describe('game tools integration', () => {
	it('ships the verified monster catalog and every referenced atlas', () => {
		const catalog = JSON.parse(read('applications/pwa/data/monsters/catalog.json'));
		const ids = new Set(catalog.monsters.map(monster => monster.id));
		const poring = catalog.monsters.find(monster => monster.id === 1002);

		expect(catalog.schema).toBe('happyro-monster-catalog/v2');
		expect(catalog.source.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.itemsSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.spawnsSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.monsters).toHaveLength(2675);
		expect(ids.size).toBe(catalog.monsters.length);
		expect(poring).toMatchObject({ name: '波利', nameEn: 'Poring', atlas: 0 });
		expect(poring.spawns).toContainEqual(expect.objectContaining({ mapName: 'prt_fild08', count: 87 }));
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

	it('ships the verified NPC image atlases', () => {
		const catalog = JSON.parse(read('applications/pwa/data/world/npc-assets.json'));
		expect(catalog.schema).toBe('happyro-world-assets/v3');
		expect(catalog.source.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.npcDefinitionsSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.npcCatalogVersion).toMatch(/^kro-20211105-[a-f0-9]{12}$/);
		expect(catalog.source.mapImagesSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(catalog.source.imageCount).toBe(1453);
		expect(Object.keys(catalog.sprites)).toHaveLength(1453);
		expect(catalog.mapImages.length).toBe(537);
		expect(catalog.mapImages).toContain('prontera');
		expect(catalog).not.toHaveProperty('npcInstances');
		for (const atlas of new Set(Object.values(catalog.sprites).map(sprite => sprite.atlas))) {
			expect(existsSync(resolve(projectRoot, `applications/pwa/data/world/npc-atlas-${atlas}.webp`))).toBe(true);
		}
	});

	it('shares the generated localized NPC instance table across navigation and the catalog', () => {
		const names = JSON.parse(read('src/DB/NpcNameTranslations.zh-CN.json'));
		const catalog = JSON.parse(read('src/DB/Navigation/NpcCatalog.json'));
		const assets = JSON.parse(read('applications/pwa/data/world/npc-assets.json'));
		const instances = read('src/DB/Navigation/NpcInstanceNameTable.js');
		expect(Object.keys(names)).toHaveLength(4335);
		expect(Object.values(names).every(name => /[\u3400-\u9fff]/.test(name))).toBe(true);
		expect(Object.keys(NpcInstanceNameTable).length).toBeGreaterThan(10000);
		expect(catalog.schema).toBe('happyro-npc-catalog/v1');
		expect(catalog.entries.length).toBeGreaterThan(13000);
		const teleportable = catalog.entries.filter(npc => Number.isFinite(npc.navigation_class));
		const visible = teleportable.filter(npc => Number.isFinite(npc.display_sprite_id));
		expect(teleportable).toHaveLength(4664);
		expect(visible).toHaveLength(4410);
		expect(catalog.entries.filter(npc => npc.game_visible)).toHaveLength(4410);
		expect(catalog.entries.every((npc, index) => npc.catalog_order === index)).toBe(true);
		expect(visible.every(npc => assets.sprites[npc.display_sprite_id])).toBe(true);
		expect(Object.values(NpcInstanceNameTable).every(npc => /[\u3400-\u9fff]/.test(npc.name))).toBe(true);
		expect(NpcInstanceNameTable['aldeba_in:155:240']).toMatchObject({
			name: '卡普拉员工',
			sourceName: 'Kafra Employee'
		});
		expect(instances).toContain('aldeba_in:155:240');
		expect(instances).toContain('卡普拉员工');
		expect(read('src/DB/Navigation/NavigationData.js')).toContain('getNpcInstanceName(npc[0], npc[6], npc[7])');
		expect(read('src/UI/Components/GameTools/NpcCatalogTab.js')).toContain('mergeNpcCatalog');
	});

	it('registers independent NPC and map catalog tabs', () => {
		const source = read('src/UI/Components/GameTools/GameTools.js');
		expect(source).toContain('registerGameToolsTab(npcCatalogTab)');
		expect(source).toContain('registerGameToolsTab(mapCatalogTab)');
		expect(source).toContain('registerGameToolsTab(itemCatalogTab)');
	});

	it('centers the adventure tools window from the current viewport dimensions', () => {
		const source = read('src/UI/Components/GameTools/GameTools.js');
		const css = read('src/UI/Components/GameTools/GameTools.css');
		expect(source).toContain('(viewportWidth - width) / 2');
		expect(source).toContain('(viewportHeight - height) / 2');
		expect(source).not.toContain('{ x: 250, y: 90');
		expect(css).not.toMatch(/:host\s*\{[^}]*(?:top|left):\s*\d+px/s);
	});

	it('uses lazy map thumbnails and the shared marked map preview', () => {
		const mapSource = read('src/UI/Components/GameTools/MapCatalogTab.js');
		const npcSource = read('src/UI/Components/GameTools/NpcCatalogTab.js');
		expect(mapSource).toContain('loadCatalogMapImage');
		expect(mapSource).toContain('data-map-thumb');
		expect(mapSource).toContain('drawWorldMapPreview');
		expect(npcSource).toContain('npc-map-canvas');
		expect(npcSource).toContain('drawWorldMapPreview');
	});

	it('provides current-map route previews, terrain thumbnails and route lifecycle state', () => {
		const mapSource = read('src/UI/Components/GameTools/MapCatalogTab.js');
		const previewSource = read('src/UI/Components/GameTools/WorldMapPreview.js');
		const routeSource = read('src/UI/Components/GameTools/AdventureRouteService.js');
		const navigationSource = read('src/UI/Components/Navigation/Navigation.js');
		expect(mapSource).toContain('selectedCoordinate = { x: 0, y: 0, random: true };');
		expect(mapSource).toContain('findDefaultMapCoordinate(resource?.gat) || selectedCoordinate');
		expect(mapSource).toContain("'寻路仅支持角色当前所在地图'");
		expect(mapSource).toContain('previewAdventureRoute(nextTarget)');
		expect(mapSource).toContain('player: sameMap ? position : null');
		expect(mapSource).toContain("typeof IntersectionObserver === 'function'");
		expect(previewSource).toContain('drawWalkableMapPreview(context, canvas, coordinateGrid)');
		expect(previewSource).toContain('drawPath(context, canvas, overlays.path, coordinateGrid)');
		expect(previewSource).toContain('drawPlayer(context, canvas, overlays.player, coordinateGrid)');
		expect(routeSource).toContain('Navigation.navigateTo({');
		expect(routeSource).toContain('normalizeAdventureMap(nextTarget.mapName) !== getCurrentAdventureMap()');
		expect(routeSource).not.toContain('new PACKET.CZ.REQUEST_MOVE');
		expect(navigationSource).toContain('_autoWalkRequested = Boolean(options.autoWalk);');
		expect(navigationSource).toContain('Navigation.subscribeRouteState = function subscribeRouteState(listener)');
		expect(navigationSource).toMatch(
			/Navigation\.findPath = async function findPath\([^)]*\) \{\s*const navigationRequestId = _navigationRequestId;\s*initializePathFindingWorker\(\);/
		);
		expect(navigationSource).toContain('if (navigationRequestId !== _navigationRequestId) return;');
	});

	it('keeps monster location scrolling and waits for coordinate teleport results', () => {
		const monsterSource = read('src/UI/Components/GameTools/MonsterCatalogTab.js');
		const actionSource = read('src/UI/Components/GameTools/AdventureActionService.js');
		expect(monsterSource).toContain('locations.scrollTop = state.locationScrollTop;');
		expect(actionSource).toContain('new PACKET.CZ.HAPPYRO_MAP_TELEPORT()');
		expect(actionSource).toContain('handleMapTeleportResult');
	});

	it('keeps NPC availability requests valid across detail rerenders', () => {
		const source = read('src/UI/Components/GameTools/NpcCatalogTab.js');

		expect(source).toContain('const token = selectionToken;');
		expect(source).toMatch(/resetSelectionAvailability = \(\) => \{\s*selectionToken \+= 1;/);
		expect(source).not.toContain('const token = ++selectionToken;');
		expect(source).not.toContain('catalog-route');
		expect(source).not.toContain('AdventureRouteService');
		expect(source).toContain('class="catalog-teleport"');
		expect(source).toContain('npcAtlasStyle(manifest, npc.spriteId');
	});

	it('uses the complete contextual name for the vampire illusion map', () => {
		expect(read('src/DB/Map/MapTable.js')).toContain("displayName: '第250页（吸血鬼幻影）'");
	});

	it('wires both active toolbar versions and the private packet pair', () => {
		expect(read('src/UI/Components/BasicInfo/BasicInfoV4/BasicInfoV4.html')).toContain('id="game-tools"');
		expect(read('src/UI/Components/BasicInfo/BasicInfoV5/BasicInfoV5.html')).toContain('id="game-tools"');
		expect(read('src/Network/PacketStructure.js')).toContain('pkt_buf.writeShort(0xcfe)');
		expect(read('src/Network/PacketRegister.js')).toContain('0xcff: PACKET.ZC.HAPPYRO_MONSTER_SPAWN_RESULT');
		expect(read('src/Network/PacketStructure.js')).toContain('pkt_buf.writeShort(0xcfc)');
		expect(read('src/Network/PacketRegister.js')).toContain('0xcfd: PACKET.ZC.HAPPYRO_NPC_TELEPORT_RESULT');
		expect(read('src/Network/PacketStructure.js')).toContain('pkt_buf.writeShort(0xcfa)');
		expect(read('src/Network/PacketRegister.js')).toContain(
			'0xcfb: PACKET.ZC.HAPPYRO_NPC_AVAILABILITY_RESULT'
		);
		expect(read('src/Network/PacketStructure.js')).toContain('pkt_buf.writeShort(0xd00)');
		expect(read('src/Network/PacketRegister.js')).toContain('0xd01: PACKET.ZC.HAPPYRO_MAP_TELEPORT_RESULT');
		expect(read('src/Network/PacketLength.js')).toContain('packets_len[0x0d01] = 32');
		expect(read('src/Network/PacketLength.js')).toContain('packets_len[0x0cfb] = -1');
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
		expect(css).toMatch(/\.monster-drops,\s*\.monster-locations\s*\{[^}]*overflow-y:\s*auto/s);
		expect(css).toMatch(/\.monster-resources\s*\{[^}]*grid-template-columns:/s);
		expect(css).toMatch(/\.summon-panel\s*\{[^}]*margin:\s*0 -12px -12px/s);
		expect(css).not.toMatch(/\.summon-panel\s*\{[^}]*position:\s*sticky/s);
	});

	it('renders localized drop names while retaining source names as metadata', () => {
		const source = read('src/UI/Components/GameTools/MonsterCatalogTab.js');

		expect(source).toContain('escapeHtml(drop.name || drop.Item)');
		expect(source).toContain('title="${escapeHtml(drop.nameEn || drop.Item)}"');
		expect(source).toContain('teleportToCoordinate(teleportTarget);');
		expect(source).toContain('>传送到地图</button>');
		expect(source).not.toContain('${spawn.count} 只');
	});
});
