/**
 * UI/Components/WorldMap/WorldMap.js
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author IssID
 */

import DB from 'DB/DBManager.js';
import Client from 'Core/Client.js';
import Configs from 'Core/Configs.js';
import Preferences from 'Core/Preferences.js';
import KEYS from 'Controls/KeyEventHandler.js';
import Renderer from 'Renderer/Renderer.js';
import MapRenderer from 'Renderer/MapRenderer.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import Session from 'Engine/SessionStorage.js';
import MAPS from 'DB/Map/WorldMap.js';
import htmlText from './WorldMap.html?raw';
import cssText from './WorldMap.css?raw';
import Navigation from 'UI/Components/Navigation/Navigation.js';
import { applyWorldMapState } from './WorldMapState.js';
import { chooseDungeonLabelOffset } from './WorldMapLabelLayout.js';
import { applyMonsterSummaries } from './WorldMapMonsterSummary.js';

/**
 * Create Component
 */
const WorldMap = new GUIComponent('WorldMap', cssText);

WorldMap.render = () => htmlText;

/**
 * @type {Preferences} window preferences
 */
const _preferences = Preferences.get(
	'WorldMap',
	{
		x: 0,
		y: 0,
		width: window.innerWidth,
		height: window.innerHeight,
		show: false
	},
	1.0
);

// Party member store
let _partyMembersByMap = {};

let _hoveredSection = null;

let _mapLoadRequestId = 0;

let _monsterSummariesPromise;

// Sizing params
const C_TITLEBARHEIGHT = 17;
const C_BASEWIDTH = 1280;
const C_BASEHEIGHT = 1024;
const C_ASPECTX = 5;
const C_ASPECTY = 4;

function loadMonsterSummaries() {
	if (!_monsterSummariesPromise) {
		const url = new URL('./data/monsters/catalog.json', window.location.href);
		_monsterSummariesPromise = fetch(url)
			.then(response => {
				if (!response.ok) throw new Error(`Monster catalog request failed: ${response.status}`);
				return response.json();
			})
			.then(catalog => {
				const candidates = new Map();
				for (const monster of catalog.monsters || []) {
					const countsByMap = new Map();
					for (const spawn of monster.spawns || []) {
						const mapName = String(spawn.mapName || '').toLocaleLowerCase();
						countsByMap.set(mapName, (countsByMap.get(mapName) || 0) + Number(spawn.count || 0));
					}
					for (const [mapName, count] of countsByMap) {
						const current = candidates.get(mapName);
						if (!current || count > current.count) {
							candidates.set(mapName, { name: monster.name, count });
						}
					}
				}
				return candidates;
			});
	}
	return _monsterSummariesPromise;
}

function populateMonsterSummaries(mapView) {
	loadMonsterSummaries()
		.then(summaries => applyMonsterSummaries(mapView, summaries))
		.catch(error => console.error('[WorldMap] Failed to load monster summaries:', error));
}

/**
 * Initialize UI
 */
WorldMap.init = function init() {
	const root = this.getRoot();

	const bases = root.querySelectorAll('.titlebar .base');
	bases.forEach(el => el.addEventListener('mousedown', stopPropagation));

	const selectEl = root.querySelector('.titlebar select');
	if (selectEl) selectEl.addEventListener('change', onSelect);

	const toggleBtn = root.querySelector('.titlebar .togglemaps');
	if (toggleBtn) toggleBtn.addEventListener('click', onToggleMaps);

	const showLvlBtn = root.querySelector('.titlebar .showlvl');
	if (showLvlBtn) showLvlBtn.addEventListener('click', onShowLVL);

	const closeBtn = root.querySelector('.titlebar .close');
	if (closeBtn) closeBtn.addEventListener('click', onClose);

	const content = root.querySelector('.map .content');
	if (content) {
		content.addEventListener('click', onWorldMapSectionClick);
		content.addEventListener('mouseover', onWorldMapMouseOver);
		content.addEventListener('mouseout', onWorldMapMouseOut);
	}

	WorldMap.showLVLMode = false;
};

/**
 * Create WorldMap list of maps (select Element)
 */
function setMapList() {
	const root = WorldMap.getRoot();
	const selectEl = root.querySelector('#WorldMaps');
	if (!selectEl) return;
	let list = '';
	for (const map of MAPS) {
		if (WorldMap.settings.episode >= map.ep_from && WorldMap.settings.episode < map.ep_to) {
			list += `<option value="${map.id}">${map.name}</option>`;
		}
	}
	selectEl.innerHTML = list;
}

function onSelect() {
	const root = WorldMap.getRoot();
	selectMap(root.querySelector('.titlebar select').value);
}

function restoreViewState() {
	applyWorldMapState(WorldMap.getRoot(), {
		showAllMaps: Boolean(WorldMap.showAllMaps),
		showLevels: Boolean(WorldMap.showLVLMode),
		partyMapIds: new Set(Object.keys(_partyMembersByMap))
	});
}

/**
 * Select world map
 *
 * @param {string} name eg. `"worldmap_localizing1"`
 */
function selectMap(name = null) {
	const root = WorldMap.getRoot();
	const selectEl = root.querySelector('#WorldMaps');

	// If no name provided, keep the selected available map.
	if (!name || name === null || name === '') {
		name = selectEl?.value || 'worldmap.jpg';
	}
	if (selectEl) selectEl.value = name;

	const requestId = ++_mapLoadRequestId;
	// load map image asset and render it
	Client.loadFile(DB.INTERFACE_PATH + name, data => {
		if (requestId !== _mapLoadRequestId) return;

		// find map data by name and render it
		for (const map of MAPS) {
			if (map.id === name) {
				createWorldMapView(map, data);
				restoreViewState();
				resizeMap();
				break;
			}
		}
	});
}

/**
 * Resize world map
 */
function resizeMap() {
	const root = WorldMap.getRoot();
	const mapContainer = root.querySelector('.map-view');
	if (!mapContainer) return;

	const currentwidth = (typeof Renderer !== 'undefined' && Renderer.width) || window.innerWidth;
	const currentheight =
		((typeof Renderer !== 'undefined' && Renderer.height) || window.innerHeight) - C_TITLEBARHEIGHT;

	const xmult = currentwidth / C_BASEWIDTH;
	const ymult = currentheight / C_BASEHEIGHT;

	let mult = xmult;
	if (currentwidth / C_ASPECTX > currentheight / C_ASPECTY) {
		mult = ymult;
	}

	mapContainer.style.width = C_BASEWIDTH * mult + 'px';
	mapContainer.style.height = C_BASEHEIGHT * mult + 'px';
	resolveDungeonLabelCollisions(mapContainer);
}

function resolveDungeonLabelCollisions(mapView) {
	const labels = [...mapView.querySelectorAll('.section.is-dungeon-label .section-labels')].sort((left, right) => {
		const leftRect = left.parentElement.getBoundingClientRect();
		const rightRect = right.parentElement.getBoundingClientRect();
		return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
	});
	const mapRect = mapView.getBoundingClientRect();
	const placed = [];

	for (const label of labels) {
		label.style.removeProperty('--label-offset-y');
		const offset = chooseDungeonLabelOffset(label.getBoundingClientRect(), mapRect, placed);
		label.style.setProperty('--label-offset-y', `${offset}px`);
		placed.push(label.getBoundingClientRect());
	}
}

/**
 * When worldmap container is clicked
 * @param {*} e
 */
function onWorldMapSectionClick(e) {
	const section = e.target.closest('.section');
	if (!section) return;

	const displayName = section.getAttribute('data-displayname') || '';
	const mapId = section.id;

	Navigation.showMap(mapId, displayName);
	Navigation.focus();
}

/**
 * When worldmap container is mouse over
 * @param {*} e
 */
function onWorldMapMouseOver(e) {
	const section = e.target.closest('.section');
	if (!section || section === _hoveredSection) return;
	_hoveredSection = section;
	showTooltip(section);
}

/**
 * When worldmap container is mouse out
 * @param {*} e
 */
function onWorldMapMouseOut(e) {
	if (!_hoveredSection) return;
	if (_hoveredSection.contains(e.relatedTarget)) return;
	_hoveredSection = null;
	hideTooltip();
}

/**
 * Show tooltip
 * @param {*} section
 */
function showTooltip(section) {
	const root = WorldMap.getRoot();
	const tooltip = root.querySelector('#map-tooltip');
	if (!tooltip) return;

	const displayName = section.getAttribute('data-displayname') || '';
	const monsterName = section.getAttribute('data-monstername') || '';
	const monsterLevel = section.getAttribute('data-monsterlevel') || '';
	tooltip.querySelector('.tooltip-mapname').textContent = displayName;
	tooltip.querySelector('.tooltip-mapid').textContent = section.id;
	const monsterInfo = tooltip.querySelector('.tooltip-monster-info');
	if (monsterInfo) {
		monsterInfo.style.display = WorldMap.showLVLMode && (monsterName || monsterLevel) ? '' : 'none';
		monsterInfo.querySelector('.tooltip-monstername').textContent = monsterName;
		monsterInfo.querySelector('.tooltip-monsterlevel').textContent = monsterLevel;
	}
	const tooltipImg = tooltip.querySelector('.tooltip-img');
	tooltipImg.style.backgroundImage = '';

	// position tooltip
	const rect = section.getBoundingClientRect();
	tooltip.style.display = 'block';
	tooltip.style.left = rect.right + 10 + 'px';
	tooltip.style.top = rect.top + 'px';

	// adjust if tooltip is out of screen
	const tooltipRect = tooltip.getBoundingClientRect();
	if (tooltipRect.right > window.innerWidth) {
		tooltip.style.left = rect.left - tooltipRect.width - 10 + 'px';
	}
	if (tooltipRect.bottom > window.innerHeight) {
		tooltip.style.top = window.innerHeight - tooltipRect.height - 10 + 'px';
	}

	// load map image asset and render it
	Client.loadFile(`${DB.INTERFACE_PATH}map/${section.id}.bmp`, data => {
		if (_hoveredSection === section) {
			tooltipImg.style.backgroundImage = data ? `url(${data})` : '';
		}
	});
}

/**
 * Hide tooltip
 */
function hideTooltip() {
	const root = WorldMap.getRoot();
	const tooltip = root.querySelector('#map-tooltip');
	if (tooltip) {
		tooltip.style.display = 'none';
	}
}

/**
 * Create the .worldmap container and loop through all the maps
 * and render them to the container.
 *
 * @param {WorldMap} map world map data
 * @param {string} imgData world map image data as a base64
 */
function createWorldMapView(map, imgData) {
	const root = WorldMap.getRoot();
	const container = root.querySelector('.map .content');
	const worldmap = document.createElement('div');
	const currentMap = MapRenderer.currentMap.replace(/\.gat$/i, '');

	worldmap.className = 'worldmap' + (WorldMap.showLVLMode ? ' show-lvls' : '');

	// set loaded worldmap background image
	const mapView = document.createElement('div');
	mapView.id = map.id;
	mapView.className = 'map-view';
	mapView.style.backgroundImage = `url(${imgData})`;
	mapView.setAttribute('data-name', map.name);
	worldmap.appendChild(mapView);

	const dgMapPositions = {};
	for (const section of map.maps) {
		if (section.type !== undefined && section.type === 1) {
			dgMapPositions[section.index] = {
				W: section.width,
				H: section.height,
				x: section.left + section.width / 2,
				y: section.top + section.height / 2
			};
		}
	}
	const renderedDungeonPos = new Set();
	const renderedConnectorPaths = new Set();

	for (const section of map.maps) {
		//Episode & custom add/remove check
		if (
			((WorldMap.settings.episode >= section.ep_from && WorldMap.settings.episode < section.ep_to) ||
				WorldMap.settings.add.includes(section.id)) &&
			!WorldMap.settings.remove.includes(section.id)
		) {
			const el = document.createElement('div');
			const el_mapid = document.createElement('div');
			const el_mapname = document.createElement('div');
			const el_labels = document.createElement('div');

			el.id = section.id;
			el.setAttribute('data-mapid', section.id);

			let sectionType = section.type !== undefined ? section.type : 0;
			let isDungeonLabel = false;

			// connected dungeons logic
			if (sectionType === 0 && dgMapPositions[section.index]) {
				const parentPos = dgMapPositions[section.index];

				const childW = section.width;
				const childH = section.height;
				const childPos = {
					x: section.left + childW / 2,
					y: section.top + childH / 2
				};

				const parentW = parentPos.W;
				const parentH = parentPos.H;

				const deltaX = childPos.x - parentPos.x;
				const deltaY = childPos.y - parentPos.y;
				const fullLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				const angleRad = Math.atan2(deltaY, deltaX);

				const getRadius = (w, h, rad) => {
					const absCos = Math.abs(Math.cos(rad));
					const absSin = Math.abs(Math.sin(rad));
					return w * absSin <= h * absCos ? w / (2 * absCos) : h / (2 * absSin);
				};

				const startOffset = getRadius(parentW, parentH, angleRad);
				const endOffset = getRadius(childW, childH, angleRad);

				if (fullLength > startOffset + endOffset) {
					const newLength = fullLength - startOffset - endOffset;

					const startX = parentPos.x + Math.cos(angleRad) * startOffset;
					const startY = parentPos.y + Math.sin(angleRad) * startOffset;
					const endX = startX + Math.cos(angleRad) * newLength;
					const endY = startY + Math.sin(angleRad) * newLength;
					const connectorKey = `${startX}:${startY}:${endX}:${endY}`;

					if (!renderedConnectorPaths.has(connectorKey)) {
						const line = document.createElement('div');
						line.className = 'connector-line';

						line.style.left = `${(startX / C_BASEWIDTH) * 100}%`;
						line.style.top = `${(startY / C_BASEHEIGHT) * 100}%`;
						line.style.width = `${(newLength / C_BASEWIDTH) * 100}%`;

						const angleDeg = (angleRad * 180) / Math.PI;
						line.style.transform = `rotate(${angleDeg}deg)`;
						line.style.transformOrigin = '0% 50%';

						mapView.appendChild(line);
						renderedConnectorPaths.add(connectorKey);
					}
				}
				sectionType = 1;
				isDungeonLabel = true;
			}
			// -----------------------

			let className = 'section';
			if (currentMap == section.id) {
				className += ' currentmap';
			}

			if (sectionType === 1) {
				const posKey = section.left + '_' + section.top;

				if (renderedDungeonPos.has(posKey)) {
					className += ' is-dungeon-stacked';
				} else {
					className += ' is-dungeon';
					className += isDungeonLabel ? ' is-dungeon-label' : ' is-dungeon-marker';
					renderedDungeonPos.add(posKey);
				}
			}

			el.className = className;

			el.style.top = `${(section.top / C_BASEHEIGHT) * 100}%`;
			el.style.left = `${(section.left / C_BASEWIDTH) * 100}%`;
			el.style.width = `${(section.width / C_BASEWIDTH) * 100}%`;
			el.style.height = `${(section.height / C_BASEHEIGHT) * 100}%`;

			el_mapname.className = 'mapname';
			if (section.moblevel) {
				el.setAttribute('data-monsterlevel', section.moblevel);
			}

			const el_displayname = document.createElement('div');
			el_displayname.className = 'displayname';
			if (sectionType === 1) {
				// dugeons name got direct from worldmap lua files
				const name = section.name.replace(' 1', '').trim(); // small hack to remove 1 from dungeon names
				el_displayname.textContent = name;
				el.setAttribute('data-displayname', name);
			} else {
				// other maps name got from rsw files and search on mapinfo.lub theyr real names
				const mapInfo = DB.getMapInfo(section.id + '.rsw');
				const mapName = mapInfo?.displayName || section.name;
				el_displayname.textContent = mapName;
				el.setAttribute('data-displayname', mapName);
			}

			el_mapid.className = 'mapid'; // rsw name
			el_mapid.textContent = section.id;

			el_labels.className = 'section-labels';
			el_labels.appendChild(el_displayname);
			el.appendChild(el_mapid);

			if (section.moblevel !== undefined && section.moblevel.length > 0) {
				const el_level = document.createElement('div');
				el_level.className = 'level-range-text';
				el_level.innerText = section.moblevel;
				el_labels.appendChild(el_level);
			}
			el_labels.appendChild(el_mapname);
			el.appendChild(el_labels);

			mapView.appendChild(el);
		}
	}
	// airplanes, currently only in the worldmap
	if (map.id === 'worldmap') {
		loadAirplane(mapView);
	}
	worldmap.appendChild(mapView);
	container.innerHTML = '';
	container.appendChild(worldmap);
	populateMonsterSummaries(mapView);
}

/**
 * Load airplane image and append it to the DOM (.map-view element)
 *
 * @param {HTMLElement} mapView target where to append to
 */
function loadAirplane(mapView) {
	Client.loadFile(DB.INTERFACE_PATH + 'worldview_interface/wv_airplen32.bmp', data => {
		const airplane = document.createElement('img');
		airplane.id = 'midgard-airplane';
		airplane.className = 'airplane';
		airplane.decoding = 'async';
		airplane.src = data;
		// update it's position and angle
		setAirplanePosition(airplane);
		mapView.appendChild(airplane);
	});
}

/**
 * Refresh airplane position
 *
 * @param {HTMLElement} airplane optional. if not provided, will use .worldmap #midgard-airplane
 *
 * @todo use server time and set position and angle
 */
function setAirplanePosition(airplane) {
	const root = WorldMap.getRoot();
	const el = airplane || root.querySelector('.worldmap #midgard-airplane');
	if (!el) return;
	el.style.top = '35%';
	el.style.left = '35%';
	el.style.transform = 'rotate(75deg)';
}

/**
     * helper function to convert purple (255,0,255) color to transparent from image.
     *
     * Note: will not work on local files, needs to be hosted on
     * server for CORS (See: 'getImageData' on 'CanvasRenderingContext2D':
     * The canvas has been tainted by cross-origin data)
     *
     * @param {HTMLImageElement} img source image element
     *
     * @example
     const img = document.querySelector('img');
         img.src = `textures/map/${e.target.id}.bmp`;
         img.onload = () => adjustImageTransparency(img);
     */
function _adjustImageTransparency(img) {
	const canvas = document.createElement('canvas');
	canvas.width = img.width || img.clientWidth;
	canvas.height = img.height || img.clientHeight;

	const ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0);

	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	// iterate over all pixels
	// in the image data and turn purple pixels transparent
	const n = imgData.data.length;
	let red,
		green,
		blue,
		isPurple = false;

	for (let i = 0; i < n; i += 4) {
		red = imgData.data[i];
		green = imgData.data[i + 1];
		blue = imgData.data[i + 2];

		// with exact color
		isPurple = red === 255 && blue === 255 && green === 0;
		// with some tolerance
		// let isPurple = (red >= 150 && blue >= 150) && green < 150;

		if (isPurple) {
			imgData.data[i + 3] = 0; // Set alpha channel to 0 for transparency
		}
	}
	ctx.putImageData(imgData, 0, 0);

	// replace the existing source image with the new one
	img.decoding = 'async';
	img.src = canvas.toDataURL();
}

/**
 * Apply preferences once append to body
 */
WorldMap.onAppend = function onAppend() {
	// Apply preferences
	if (!_preferences.show) {
		this._host.style.display = 'none';
	}

	// settings
	this.settings = { episode: 98, add: [], remove: [] };
	const conf = Configs.get('worldMapSettings', { episode: 98, add: [], remove: [] });

	// Prevent stupidity
	if ('episode' in conf) {
		this.settings.episode = conf.episode;
	}

	if ('add' in conf && Array.isArray(conf.add)) {
		this.settings.add = conf.add;
	}

	if ('remove' in conf && Array.isArray(conf.remove)) {
		this.settings.remove = conf.remove;
	}

	console.log('%c[WoldMap] Episode: ', 'color:#007000', this.settings.episode);
	if (this.settings.add.length > 0) {
		console.log('%c[WoldMap] Add Maps: ', 'color:#007000', this.settings.add);
	}
	if (this.settings.remove.length > 0) {
		console.log('%c[WoldMap] Remove Maps: ', 'color:#007000', this.settings.remove);
	}

	// set maps
	setMapList();
	this.showAllMaps = false;

	// resize map container & add sections
	selectMap(this.getRoot().querySelector('#WorldMaps')?.value);

	this._host.style.top = '0px';
	this._host.style.left = '0px';
};

WorldMap.onRemove = function onRemove() {
	// Save preferences
	_preferences.show = this._host.style.display !== 'none';
	_preferences.y = 0;
	_preferences.x = 0;
	_preferences.width = 0;
	_preferences.height = 0;
	_preferences.save();
};

/**
 * Show/Hide UI
 */
WorldMap.toggle = function toggle() {
	const isVisible = this._host.style.display !== 'none';
	if (isVisible) {
		this._host.style.display = 'none';
		_hoveredSection = null;
		hideTooltip();
	} else {
		_hoveredSection = null;
		this._host.style.display = '';
		const selectedMap = this.getRoot().querySelector('#WorldMaps')?.value;
		selectMap(selectedMap);
		this.focus();
	}
};

WorldMap.captureKeyEvents = true;

WorldMap.onKeyDown = function onKeyDown(event) {
	if (this.isEditableFocused()) {
		if (event.which === KEYS.ESCAPE || event.key === 'Escape') {
			this.toggle();
			event.stopImmediatePropagation();
			return false;
		}
		event.stopImmediatePropagation();
		return true;
	}

	if ((event.which === KEYS.ESCAPE || event.key === 'Escape') && this._host.style.display !== 'none') {
		this.toggle();
	}
};

/**
 * Process shortcut
 *
 * @param {object} key
 */
WorldMap.onShortCut = function onShortCut(key) {
	switch (key.cmd) {
		case 'TOGGLE':
			this.toggle();
			break;
	}
};

/**
 * Resize UI
 */
WorldMap.onResize = function () {
	resizeMap();
};

/**
 * Update party members on map
 *
 * @param {object} pkt
 */
WorldMap.updatePartyMembers = function updatePartyMembers(pkt) {
	_partyMembersByMap = {};
	pkt.groupInfo.forEach(member => {
		if (member.AID !== Session.AID && member.state === 0) {
			const mapId = member.mapName.replace(/\.gat$/i, '');
			if (!_partyMembersByMap[mapId]) {
				_partyMembersByMap[mapId] = [];
			}
			_partyMembersByMap[mapId].push({ AID: member.AID, Name: member.characterName });
		}
	});

	restoreViewState();
};

/**
 * Toggle all maps
 */
function onToggleMaps() {
	WorldMap.showAllMaps = !WorldMap.showAllMaps;
	restoreViewState();
}

/**
 * Show Monster level range
 */
function onShowLVL() {
	WorldMap.showLVLMode = !WorldMap.showLVLMode;
	const root = WorldMap.getRoot();

	Client.loadFile(DB.INTERFACE_PATH + 'checkbox_' + (WorldMap.showLVLMode ? '1' : '0') + '.bmp', function (data) {
		const btn = root.querySelector('.showlvl');
		if (btn) btn.style.backgroundImage = 'url(' + data + ')';
	});

	const worldmapEl = root.querySelector('.worldmap');
	if (worldmapEl) {
		restoreViewState();
		resizeMap();
	}
}

/**
 * Stop event propagation
 * @param {object} event
 */
function stopPropagation(event) {
	event.stopImmediatePropagation();
	return false;
}

/**
 * Closing window
 */
function onClose() {
	WorldMap._host.style.display = 'none';
	_hoveredSection = null;
	hideTooltip();
}

WorldMap.mouseMode = GUIComponent.MouseMode.STOP;

/**
 * Create component and export it
 */
export default UIManager.addComponent(WorldMap);
