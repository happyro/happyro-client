import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const snapshotPath = path.resolve(
	projectRoot,
	process.env.MONSTER_CATALOG_SOURCE || '../happyro-admin/backend/resources/game-data/monsters/renewal.json'
);
const itemSnapshotPath = path.resolve(
	projectRoot,
	process.env.ITEM_CATALOG_SOURCE || '../happyro-admin/backend/resources/game-data/items/renewal.json'
);
const imageDirectory = path.resolve(
	projectRoot,
	process.env.MONSTER_IMAGE_SOURCE || '../../work/game-data/monsters/kro-20211105'
);
const outputDirectory = path.resolve(projectRoot, 'applications/pwa/data/monsters');
const tileSize = 96;
const contentSize = 88;
const columns = 20;
const rows = 20;
const entriesPerSheet = columns * rows;

const snapshotBuffer = await fs.readFile(snapshotPath);
const snapshot = JSON.parse(snapshotBuffer.toString('utf8'));
const itemSnapshotBuffer = await fs.readFile(itemSnapshotPath);
const itemSnapshot = JSON.parse(itemSnapshotBuffer.toString('utf8'));
const itemsByAegisName = new Map(
	Object.entries(itemSnapshot.items).map(([id, item]) => [item.AegisName, { id: Number.parseInt(id, 10), item }])
);
const imageFiles = (await fs.readdir(imageDirectory)).filter(file => /^\d+\.png$/.test(file));
const imageIds = new Set(imageFiles.map(file => Number.parseInt(file, 10)));
const monsters = Object.entries(snapshot.monsters)
	.map(([id, monster]) => ({ id: Number.parseInt(id, 10), monster }))
	.sort((left, right) => left.id - right.id);
const monstersWithImages = monsters.filter(({ id }) => imageIds.has(id));
const atlasIndexById = new Map(monstersWithImages.map(({ id }, index) => [id, index]));

function localizeDrops(drops = []) {
	return drops.map(drop => {
		const entry = itemsByAegisName.get(drop.Item);
		if (!entry?.item.names?.['zh-CN']) {
			throw new Error(`Missing zh-CN item localization for monster drop: ${drop.Item}`);
		}
		return {
			...drop,
			itemId: entry.id,
			name: entry.item.names['zh-CN'],
			nameEn: entry.item.names['en-US'] || drop.Item
		};
	});
}

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });

for (let sheetIndex = 0; sheetIndex * entriesPerSheet < monstersWithImages.length; sheetIndex += 1) {
	const sheetEntries = monstersWithImages.slice(sheetIndex * entriesPerSheet, (sheetIndex + 1) * entriesPerSheet);
	const composites = await Promise.all(
		sheetEntries.map(async ({ id }, tileIndex) => {
			const image = sharp(path.join(imageDirectory, `${id}.png`));
			const resized = await image
				.resize(contentSize, contentSize, { fit: 'inside', withoutEnlargement: true, kernel: 'nearest' })
				.png()
				.toBuffer({ resolveWithObject: true });
			const column = tileIndex % columns;
			const row = Math.floor(tileIndex / columns);
			return {
				input: resized.data,
				left: column * tileSize + Math.floor((tileSize - resized.info.width) / 2),
				top: row * tileSize + Math.floor((tileSize - resized.info.height) / 2)
			};
		})
	);

	await sharp({
		create: {
			width: columns * tileSize,
			height: rows * tileSize,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	})
		.composite(composites)
		.webp({ lossless: true, effort: 6 })
		.toFile(path.join(outputDirectory, `atlas-${sheetIndex}.webp`));
}

const catalog = {
	schema: 'happyro-monster-catalog/v1',
	source: {
		sha256: crypto.createHash('sha256').update(snapshotBuffer).digest('hex'),
		itemsSha256: crypto.createHash('sha256').update(itemSnapshotBuffer).digest('hex'),
		server: snapshot.serverSource,
		client: snapshot.clientSource,
		items: itemSnapshot.source
	},
	atlas: { tileSize, columns, rows },
	monsters: monsters.map(({ id, monster }) => {
		const atlasIndex = atlasIndexById.get(id);
		return {
			id,
			aegisName: monster.AegisName,
			name: monster.names?.['zh-CN'] || monster.names?.['en-US'] || monster.AegisName,
			nameEn: monster.names?.['en-US'] || monster.AegisName,
			level: monster.Level,
			hp: monster.Hp,
			attack: [monster.Attack, monster.Attack2],
			defense: monster.Defense,
			magicDefense: monster.MagicDefense,
			race: monster.Race,
			element: monster.Element,
			elementLevel: monster.ElementLevel,
			size: monster.Size,
			class: monster.Class || 'Normal',
			boss: monster.Class === 'Boss',
			mvp: Boolean(monster.MvpDrops?.length),
			baseExp: monster.BaseExp,
			jobExp: monster.JobExp,
			drops: localizeDrops(monster.Drops),
			mvpDrops: localizeDrops(monster.MvpDrops),
			atlas: atlasIndex === undefined ? null : Math.floor(atlasIndex / entriesPerSheet),
			tile: atlasIndex === undefined ? null : atlasIndex % entriesPerSheet
		};
	})
};

await fs.writeFile(path.join(outputDirectory, 'catalog.json'), `${JSON.stringify(catalog)}\n`);
console.log(
	`Generated ${monsters.length} monsters (${monstersWithImages.length} images) in ${Math.ceil(monstersWithImages.length / entriesPerSheet)} atlases.`
);
