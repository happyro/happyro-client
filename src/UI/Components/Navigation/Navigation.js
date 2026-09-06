/**
 * UI/Components/Navigation/Navigation.js
 *
 * Navigation window for NAVI links
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

import KEYS from 'Controls/KeyEventHandler.js';
import Renderer from 'Renderer/Renderer.js';
import MapRenderer from 'Renderer/MapRenderer.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import 'UI/Elements/Elements.js';
import Altitude from 'Renderer/Map/Altitude.js';
import Session from 'Engine/SessionStorage.js';
import Client from 'Core/Client.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import PACKETVER from 'Network/PacketVerManager.js';
import DB from 'DB/DBManager.js';
import htmlText from './Navigation.html?raw';
import cssText from './Navigation.css?raw';
import MapPathFinder from './MapPathFinder.js';
import { isNavigationSearchInteraction } from './NavigationSearchInteraction.js';
import { selectAutoWalkWaypoint } from './NavigationAutoWalk.js';

/**
 * Create Navigation component
 */
const Navigation = new GUIComponent('Navigation', cssText);

Navigation.render = () => htmlText;

/**
 * Async image create helper
 */
function createAsyncImage() {
	const img = new Image();
	img.decoding = 'async';
	return img;
}

/**
 * @var {Image} arrow image
 */
const _arrow = createAsyncImage();

/**
 * @var {Image} map information images
 */
const _toolDealer = createAsyncImage();
const _weaponDealer = createAsyncImage();
const _armorDealer = createAsyncImage();
const _blacksmith = createAsyncImage();
const _guide = createAsyncImage();
const _inn = createAsyncImage();
const _kafra = createAsyncImage();

/**
 * @var {Image} minimap image
 */
const _map = createAsyncImage();

/**
 * @var {CanvasRenderingContext2D} canvas context
 */
let _ctx = null;

/**
 * @var {Array} town information
 */
let _towninfo = [];

/**
 * @var {Array} markers on the map
 */
const _markers = [];

/**
 * @var {Array} path points
 */
let _path = [];

/**
 * @var {number} Last time the path was recalculated
 */
let _lastPathUpdate = 0;

/**
 * @var {number} Minimum time between path recalculations (in ms)
 */
const _pathUpdateThrottle = 500;

/**
 * @var {boolean} Lock for path update
 */
let _pathUpdateLock = false;

/**
 * @var {Worker} pathfinding worker
 */
let _pathFindingWorker = null;

/**
 * @var {Object} map data
 */
let _mapData = null;

/**
 * @var {number} latest map resource request
 */
let _mapLoadRequestId = 0;

/**
 * @var {number} latest navigation request
 */
let _navigationRequestId = 0;

/**
 * @var {string|null} map represented by the current image
 */
let _mapImageMap = null;

/**
 * @var {Object} target data
 */
let _targetData = null;

/**
 * @var {Object} final target data
 */
let _finalTargetData = null;

/** @var {Object|null} explicit map coordinate selected for an action */
let _selectedTargetData = null;

let _autoWalkTimer = null;
let _autoWalkActive = false;

/**
 * @var {boolean} was target set by map click
 */
let _isMapClickTarget = false;

/**
 * @var {boolean} whether the current route is known to be unavailable
 */
let _pathUnavailable = false;

/**
 * @var {boolean} blinking state for target coordinates
 */
let _blinking = false;

/**
 * @var {number} fade interval ID for blinking
 */
let _fadeInterval = null;

/**
 * @var {string} original color for blinking restore
 */
let _originalColor = '';

/**
 * Document click handler reference for cleanup
 */
let _documentClickHandler = null;

/**
 * Local utility functions
 */

/**
 * Normalize a map name (remove .gat extension)
 */
function normalizeMapName(mapName) {
	if (!mapName) return '';
	mapName = mapName.replace(/\.gat$/, '').toLowerCase();
	mapName = mapName.replace(/^(.+)_[a-d]$/, '$1');
	return mapName;
}

/**
 * Format coordinates with consistent styling
 */
function formatCoordinates(x, y, options) {
	options = options || {};
	const shouldFloor = options.floor !== false;

	if (shouldFloor) {
		return `${Math.floor(x)},${Math.floor(y)}`;
	}
	return `${x},${y}`;
}

/**
 * Format target coordinates text with consistent styling
 */
function formatTargetCoordinates(x, y, options) {
	options = options || {};

	let text = Number.isFinite(x) && Number.isFinite(y) ? `${Math.floor(x)},${Math.floor(y)}` : '';

	if (options.noPathFound) {
		text += text ? '（未找到路径）' : '未找到路径';
	} else if (options.targetMap && options.targetMap !== getCurrentMap()) {
		text += ` (${options.targetMap})`;
	}

	return text;
}

/**
 * Format location title with consistent styling
 */
function formatLocationTitle(currentMap, targetMap, displayName) {
	let text;

	if (!displayName && targetMap && currentMap !== targetMap) {
		text = `[${currentMap} → ${targetMap}]`;
	} else {
		text = `[${displayName || currentMap}]`;
	}

	return text;
}

/**
 * Convert map coordinates to screen coordinates
 */
function mapToScreen(x, y, width, height) {
	const scaleX = width / _mapData.width;
	const scaleY = height / _mapData.height;
	const scale = Math.min(scaleX, scaleY);

	const mapWidth = _mapData.width * scale;
	const mapHeight = _mapData.height * scale;

	const offsetX = (width - mapWidth) / 2;
	const offsetY = (height - mapHeight) / 2;

	const screenX = (x / _mapData.width) * mapWidth + offsetX;
	const screenY = ((_mapData.height - y) / _mapData.height) * mapHeight + offsetY;

	return { x: screenX, y: screenY };
}

/**
 * Get the current map name
 */
function getCurrentMap() {
	if (MapRenderer && MapRenderer.currentMap) {
		return normalizeMapName(MapRenderer.currentMap);
	}
}

/**
 * Get the current player position
 */
function getPlayerPosition() {
	if (!Session.Entity || !Session.Entity.position) {
		return { x: 0, y: 0 };
	}
	const currentX = Math.ceil(Session.Entity.position[0]);
	const currentY = Math.ceil(Session.Entity.position[1]);

	return { x: currentX, y: currentY };
}

/**
 * Whether the current account should see self-teleport controls.
 * The map server remains authoritative when the packet is handled.
 */
function canSelfTeleport() {
	return Boolean(Session.Entity?.isAdmin || Session.UserLevel >= 10);
}

/**
 * Terminate the pathfinding worker
 */
function terminatePathFindingWorker() {
	if (_pathFindingWorker) {
		_pathFindingWorker.terminate();
		_pathFindingWorker = null;
	}
}

/**
 * Initialize the pathfinding worker
 */
function initializePathFindingWorker() {
	if (!_pathFindingWorker) {
		_pathFindingWorker = new Worker(new URL('./PathFindingWorker.js', import.meta.url).href);
		_pathFindingWorker.id = new Date().getTime().toString();
		_pathFindingWorker.onmessage = function (e) {
			const data = e.data;
			switch (data.type) {
				case 'pathResult':
					_pathUpdateLock = false;
					if (_finalTargetData && data.path && data.workerId === _pathFindingWorker.id) {
						const mapName = getCurrentMap();
						_path = data.path;
						if (_path.length > 0) {
							this.updateTargetText();
							this.updateAutoWalkButtons();
							this.setTargetCoordinatesBlinking(false);
							this.setLocationTitle(mapName, _finalTargetData.map, _finalTargetData.displayName);
						} else {
							_pathUnavailable = true;
							this.stopAutoWalk();
							this.updateAutoWalkButtons();
							this.updateTargetText(true);
							this.setTargetCoordinatesBlinking(false);
							this.setLocationTitle(mapName, null);
						}
					}
					break;
			}
		}.bind(Navigation);
	}
}

function resetPathFindingWorker() {
	terminatePathFindingWorker();
	initializePathFindingWorker();
}

/**
 * Convert screen coordinates to map coordinates
 */
Navigation.screenToMapCoordinates = function screenToMapCoordinates(screenX, screenY) {
	if (!_mapData?.ready) return null;

	const width = 280;
	const height = 230;

	const scaleX = width / _mapData.width;
	const scaleY = height / _mapData.height;
	const scale = Math.min(scaleX, scaleY);

	const scaledMapWidth = _mapData.width * scale;
	const scaledMapHeight = _mapData.height * scale;

	const offsetX = (width - scaledMapWidth) / 2;
	const offsetY = (height - scaledMapHeight) / 2;

	let mapX = ((screenX - offsetX) / scaledMapWidth) * _mapData.width;
	let mapY = _mapData.height - ((screenY - offsetY) / scaledMapHeight) * _mapData.height;

	mapX = Math.max(0, Math.min(_mapData.width, mapX));
	mapY = Math.max(0, Math.min(_mapData.height, mapY));

	return { x: Math.floor(mapX), y: Math.floor(mapY) };
};

/**
 * Initialize component
 */
Navigation.init = function init() {
	const root = Navigation.getRoot();

	_mapData = {
		walkableType: Altitude.TYPE.WALKABLE
	};

	this._host.style.top = `${Math.max(0, Math.min(Renderer.height - 324, 200))}px`;
	this._host.style.left = `${Math.max(0, Math.min(Renderer.width - 300, 200))}px`;

	// Get canvas context
	const canvas = document.createElement('canvas');
	canvas.width = 280;
	canvas.height = 230;
	_ctx = canvas.getContext('2d');
	const mapDisplay = root.querySelector('.map-display');
	if (mapDisplay) {
		mapDisplay.appendChild(canvas);
	}

	// Load arrow image
	Client.loadFile(`${DB.INTERFACE_PATH}map/map_arrow.bmp`, dataURI => {
		_arrow.src = dataURI;
	});

	// Load town info icons
	Client.loadFile(`${DB.INTERFACE_PATH}information/store.bmp`, dataURI => {
		_toolDealer.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/weaponshop.bmp`, dataURI => {
		_weaponDealer.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/armorshops.bmp`, dataURI => {
		_armorDealer.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/smithy.bmp`, dataURI => {
		_blacksmith.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/guide.bmp`, dataURI => {
		_guide.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/inn.bmp`, dataURI => {
		_inn.src = dataURI;
	});
	Client.loadFile(`${DB.INTERFACE_PATH}information/kafra.bmp`, dataURI => {
		_kafra.src = dataURI;
	});

	// Bind events
	root.querySelector('.close').addEventListener('click', () => this.hide());
	root.querySelector('.search-button').addEventListener('click', event => {
		event.stopPropagation();
		this.onSearch();
	});
	root.querySelector('.services-toggle').addEventListener('change', () => {
		if (!_finalTargetData) return;
		_pathUnavailable = false;
		const currentMap = getCurrentMap();
		const currentPos = getPlayerPosition();
		this.navigateTo({
			startMap: currentMap,
			startX: currentPos.x,
			startY: currentPos.y,
			endMap: _finalTargetData.map,
			endX: _finalTargetData.x,
			endY: _finalTargetData.y,
			displayName: _finalTargetData.displayName
		});
	});

	const searchInput = root.querySelector('.search-input');
	searchInput.addEventListener('keypress', e => {
		if (e.which === KEYS.ENTER || e.key === 'Enter') {
			this.onSearch();
		}
	});

	// Focus handling for search input
	searchInput.addEventListener('focus', () => {
		const resultsContainer = root.querySelector('.search-results');
		if (resultsContainer && resultsContainer.children.length > 0) {
			resultsContainer.style.display = 'block';
		}
	});

	// Hide search results when clicking outside (on document level)
	_documentClickHandler = e => {
		if (!isNavigationSearchInteraction(e)) {
			const resultsContainer = root.querySelector('.search-results');
			if (resultsContainer) {
				resultsContainer.style.display = 'none';
			}
		}
	};
	document.addEventListener('click', _documentClickHandler);

	// Map click event for navigation
	root.querySelector('.map-display').addEventListener('click', e => this.onMapClick(e));
	root.querySelector('.teleport-button').addEventListener('click', e => {
		e.stopPropagation();
		this.teleportToSelectedTarget();
	});
	root.querySelector('.walk-button').addEventListener('click', e => {
		e.stopPropagation();
		this.startAutoWalk();
	});
	root.querySelector('.walk-stop-button').addEventListener('click', e => {
		e.stopPropagation();
		this.stopAutoWalk();
	});

	// Mouse move event for displaying coordinates
	root.querySelector('.map-display').addEventListener('mousemove', e => this.onMapMouseMove(e));

	// Mouse leave event to reset coordinates display
	root.querySelector('.map-display').addEventListener('mouseleave', () => this.onMapMouseLeave());

	this.draggable('.titlebar');

	// Hide the UI initially
	this.ui.hide();
};

/**
 * Once append to the DOM
 */
Navigation.onAppend = function onAppend() {
	// Clear path for clean render
	this.clearPath();

	// Start rendering
	Renderer.render(this.renderCanvas.bind(this));

	// Initialize pathfinding worker
	initializePathFindingWorker();
	this.updateTeleportButton();

	// Load the current map after initializing the worker
	const mapName = getCurrentMap();
	this.loadMap(mapName);

	if (_finalTargetData) {
		const currentPos = getPlayerPosition();
		this.navigateTo({
			startMap: mapName,
			startX: currentPos.x,
			startY: currentPos.y,
			endMap: _finalTargetData.map,
			endX: _finalTargetData.x,
			endY: _finalTargetData.y,
			displayName: _finalTargetData.displayName
		});
	}
};

/**
 * Once removed from DOM
 */
Navigation.onRemove = function onRemove() {
	this.stopAutoWalk();
	this.clearPath();
	terminatePathFindingWorker();

	// Clean up document-level event listener
	if (_documentClickHandler) {
		document.removeEventListener('click', _documentClickHandler);
	}
};

/**
 * Handle search button click
 */
Navigation.onSearch = function onSearch() {
	const root = Navigation.getRoot();
	const query = root.querySelector('.search-input').value.trim();
	const type = root.querySelector('.search-type').value;
	const resultsContainer = root.querySelector('.search-results');

	if (query.length < 2) {
		if (resultsContainer) {
			resultsContainer.replaceChildren();
			resultsContainer.style.display = 'none';
		}
		return;
	}

	// Search for NPCs and MOBs
	const results = DB.searchNavigation(query, type);

	// Display search results
	this.displaySearchResults(results);
};

/**
 * Display search results
 */
Navigation.displaySearchResults = function displaySearchResults(results) {
	const root = Navigation.getRoot();

	// Get or create results container
	let resultsContainer = root.querySelector('.search-results');
	if (!resultsContainer) {
		resultsContainer = document.createElement('div');
		resultsContainer.className = 'search-results';
		root.querySelector('.content').appendChild(resultsContainer);
	} else {
		resultsContainer.replaceChildren();
	}

	// If no results, show a message
	if (results.length === 0) {
		const noResults = document.createElement('div');
		noResults.className = 'no-results';
		noResults.textContent = '未找到结果';
		resultsContainer.appendChild(noResults);
		resultsContainer.style.display = 'block';
		return;
	}

	// Create results list
	const resultsList = document.createElement('ul');
	resultsList.className = 'results-list';
	resultsContainer.appendChild(resultsList);

	// Add each result to the list
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		const resultItem = document.createElement('li');
		resultItem.className = 'result-item';

		// Add type icon (NPC or MOB)
		const typeIcon = result.type === 'NPC' ? 'npc_icon' : result.type === 'MAP' ? 'map_icon' : 'mob_icon';
		const typeLabel = document.createElement('span');
		typeLabel.className = `result-type ${typeIcon}`;
		typeLabel.textContent = result.type;
		const nameLabel = document.createElement('span');
		nameLabel.className = 'result-name';
		nameLabel.textContent = result.name;
		const mapLabel = document.createElement('span');
		mapLabel.className = 'result-map';
		mapLabel.textContent = result.mapDisplayName || result.mapName;
		resultItem.append(typeLabel, nameLabel, mapLabel);

		// Store result data
		resultItem._resultData = result;

		// Add click handler
		resultItem.addEventListener('click', event => {
			event.stopPropagation();
			this.navigateToSearchResult(result);
		});

		resultsList.appendChild(resultItem);
	}

	// Show the results container
	resultsContainer.style.display = 'block';
};

/**
 * Navigate to a search result
 */
Navigation.navigateToSearchResult = function navigateToSearchResult(result) {
	if (!result || !result.mapName) {
		return;
	}

	this.targetResult = result;
	_isMapClickTarget = false;
	if (!Number.isFinite(result.x) || !Number.isFinite(result.y)) {
		this.showMap(result.mapName, result.mapDisplayName || result.mapName, {
			preserveSearch: true
		});
		return;
	}

	const currentMap = getCurrentMap();
	const currentPos = getPlayerPosition();

	this.navigateTo({
		startMap: currentMap,
		startX: currentPos.x,
		startY: currentPos.y,
		endMap: result.mapName,
		endX: result.x,
		endY: result.y,
		displayName: result.name
	});

	// Hide the search results
	const root = Navigation.getRoot();
	const resultsContainer = root.querySelector('.search-results');
	if (resultsContainer) {
		resultsContainer.style.display = 'none';
	}
};

/**
 * Find the closest walkable cell to the given coordinates
 */
Navigation.findClosestWalkableCell = function findClosestWalkableCell(x, y, maxRadius) {
	if (x >= 0 && x < _mapData.width && y >= 0 && y < _mapData.height) {
		const index = x + y * _mapData.width;
		const cellType = _mapData.cellTypes[index];

		if (cellType & _mapData.walkableType) {
			return { x: x, y: y };
		}
	}

	maxRadius = maxRadius || 10;
	let radius = 1;
	let bestDistance = Infinity;
	let bestCell = null;

	while (radius <= maxRadius) {
		for (let offsetY = -radius; offsetY <= radius; offsetY++) {
			for (let offsetX = -radius; offsetX <= radius; offsetX++) {
				if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) {
					continue;
				}

				const cx = x + offsetX;
				const cy = y + offsetY;

				if (cx >= 0 && cx < _mapData.width && cy >= 0 && cy < _mapData.height) {
					const index = cx + cy * _mapData.width;
					const cellType = _mapData.cellTypes[index];

					if (cellType & _mapData.walkableType) {
						const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
						if (distance < bestDistance) {
							bestDistance = distance;
							bestCell = { x: cx, y: cy };
						}
					}
				}
			}
		}

		if (bestCell) {
			return bestCell;
		}

		radius++;
	}

	return null;
};

/**
 * Handle map click event
 */
Navigation.onMapClick = function onMapClick(event) {
	if (!_mapData?.ready || !_mapData.map) return;

	const root = Navigation.getRoot();
	const mapDisplay = root.querySelector('.map-display');
	const rect = mapDisplay.getBoundingClientRect();
	const x = Math.floor(event.clientX - rect.left);
	const y = Math.floor(event.clientY - rect.top);

	const mapCoords = this.screenToMapCoordinates(x, y);
	if (!mapCoords) return;

	const currentMap = getCurrentMap();
	const currentPos = getPlayerPosition();
	const previewMap = normalizeMapName(_mapData.map);
	_selectedTargetData = { x: mapCoords.x, y: mapCoords.y, map: previewMap };

	// Keep coordinate clicks local when the navigation window is previewing another map.
	if (previewMap !== currentMap) {
		this.clearPath();
		_finalTargetData = null;
		_targetData = { x: mapCoords.x, y: mapCoords.y, map: previewMap };
		this.updateTeleportButton();
		this.setTargetCoordinatesText(mapCoords.x, mapCoords.y);
		const previewName = DB.getMapInfo(`${previewMap}.rsw`)?.displayName || DB.getMapName(previewMap, previewMap);
		this.setLocationTitle(previewMap, null, previewName);
		return;
	}

	_isMapClickTarget = true;

	this.navigateTo({
		startMap: currentMap,
		startX: currentPos.x,
		startY: currentPos.y,
		endMap: _mapData.map,
		endX: mapCoords.x,
		endY: mapCoords.y,
		displayName: DB.getMapName(_mapData.map, _mapData.map)
	});
};

/**
 * Show the self-teleport action only for configured GM characters.
 */
Navigation.updateTeleportButton = function updateTeleportButton() {
	const root = Navigation.getRoot();
	const button = root?.querySelector('.teleport-button');
	if (!button) return;

	const target = _selectedTargetData || _finalTargetData || _targetData;
	button.style.display =
		canSelfTeleport() && target && Number.isFinite(target.x) && Number.isFinite(target.y) ? 'block' : 'none';
};

Navigation.updateAutoWalkButtons = function updateAutoWalkButtons() {
	const root = Navigation.getRoot();
	const start = root?.querySelector('.walk-button');
	const stop = root?.querySelector('.walk-stop-button');
	if (!start || !stop) return;
	const canStart = Boolean(_path.length && _targetData && _targetData.map === getCurrentMap() && !_pathUnavailable);
	start.style.display = canStart && !_autoWalkActive ? 'block' : 'none';
	stop.style.display = _autoWalkActive ? 'block' : 'none';
};

Navigation.startAutoWalk = function startAutoWalk() {
	if (_autoWalkActive || !_targetData || _targetData.map !== getCurrentMap() || _pathUnavailable) return;
	_autoWalkActive = true;
	this.updateAutoWalkButtons();
	const sendTarget = () => {
		if (!_autoWalkActive || !_finalTargetData) return;
		const currentMap = getCurrentMap();
		if (!_targetData || _targetData.map !== currentMap) {
			const position = getPlayerPosition();
			this.navigateTo({
				startMap: currentMap,
				startX: position.x,
				startY: position.y,
				endMap: _finalTargetData.map,
				endX: _finalTargetData.x,
				endY: _finalTargetData.y,
				displayName: _finalTargetData.displayName
			});
			return;
		}
		const position = getPlayerPosition();
		const reachedTarget = Math.abs(position.x - _targetData.x) <= 1 && Math.abs(position.y - _targetData.y) <= 1;
		if (reachedTarget && _finalTargetData.map === currentMap) {
			this.stopAutoWalk();
			return;
		}
		const waypoint = selectAutoWalkWaypoint(_path, position) || _targetData;
		const packet = PACKETVER.value >= 20180307 ? new PACKET.CZ.REQUEST_MOVE2() : new PACKET.CZ.REQUEST_MOVE();
		packet.dest[0] = Math.floor(waypoint.x);
		packet.dest[1] = Math.floor(waypoint.y);
		Network.sendPacket(packet);
	};
	sendTarget();
	_autoWalkTimer = setInterval(sendTarget, 1200);
};

Navigation.stopAutoWalk = function stopAutoWalk() {
	_autoWalkActive = false;
	if (_autoWalkTimer) clearInterval(_autoWalkTimer);
	_autoWalkTimer = null;
	this.updateAutoWalkButtons();
};

/**
 * Request a mapmove for the currently controlled character.
 * The server derives the character from the authenticated game session.
 */
Navigation.teleportToSelectedTarget = function teleportToSelectedTarget() {
	const target = _selectedTargetData || _finalTargetData || _targetData;
	if (!target || !target.map) return;

	const packet = new PACKET.CZ.MOVETO_MAP();
	packet.mapName = normalizeMapName(target.map);
	packet.xPos = Math.max(0, Math.floor(target.x));
	packet.yPos = Math.max(0, Math.floor(target.y));
	Network.sendPacket(packet);
};

/**
 * Load a map for display
 */
Navigation.loadMap = function loadMap(mapName, displayName, onReady) {
	const mapBaseName = normalizeMapName(mapName);
	if (!mapBaseName) {
		if (onReady) onReady(false);
		return;
	}

	const requestId = ++_mapLoadRequestId;
	if (_isMapClickTarget && _mapData && _mapData.map && _mapData.map !== mapName) {
		this.clear();
		_isMapClickTarget = false;
	}

	_mapData = {
		map: mapBaseName,
		ready: false,
		walkableType: Altitude.TYPE.WALKABLE
	};
	_mapImageMap = null;

	// Load town info
	_towninfo = DB.getTownInfo(mapBaseName) || [];

	// Get the correct map path using DB.mapalias
	let bmpPath = DB.INTERFACE_PATH.replace('data/texture/', '') + 'map/' + mapBaseName + '.bmp';
	bmpPath = bmpPath.replace(/\//g, '\\');
	bmpPath = DB.mapalias[bmpPath] || bmpPath;

	// Load the map image
	Client.loadFile('data/texture/' + bmpPath, dataURI => {
		if (requestId !== _mapLoadRequestId) return;

		_mapImageMap = mapBaseName;
		if (dataURI) {
			_map.src = dataURI;
		} else {
			_map.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
		}
	});

	// Get the correct map path using DB.mapalias
	let gatPath = mapBaseName + '.gat';
	gatPath = gatPath.replace(/\//g, '\\');
	gatPath = DB.mapalias[gatPath] || gatPath;

	// Load the GAT file for pathfinding
	Client.loadFile('data/' + gatPath, gatData => {
		if (requestId !== _mapLoadRequestId) return;

		if (gatData?.cells && gatData.width && gatData.height) {
			_mapData.width = gatData.width;
			_mapData.height = gatData.height;
			_mapData.cells = gatData.cells;

			const cellCount = gatData.width * gatData.height;
			const cellTypes = new Uint8Array(cellCount);

			for (let i = 0; i < cellCount; i++) {
				const cellIndex = i * 5 + 4;
				cellTypes[i] = gatData.cells[cellIndex];
			}

			_mapData.cellTypes = cellTypes;
			_mapData.ready = true;
			if (onReady) onReady(true);
			return;
		}

		if (onReady) onReady(false);
	});

	this.setMapNameText(displayName || mapName);
};

/**
 * Open a map selected from the world map without starting a search.
 */
Navigation.showMap = function showMap(mapName, displayName, options = {}) {
	this.clear();
	this.show();

	const root = this.getRoot();
	const searchInput = root.querySelector('.search-input');
	if (searchInput && !options.preserveSearch) searchInput.value = '';

	const resultsContainer = root.querySelector('.search-results');
	if (resultsContainer) resultsContainer.style.display = 'none';

	this.loadMap(mapName, displayName);
	this.setLocationTitle(mapName, null, displayName);
	this.updateTeleportButton();
};

Navigation.showCurrentMap = function showCurrentMap() {
	const mapName = getCurrentMap();
	if (!mapName) return;
	this.showMap(mapName, DB.getMapInfo(`${mapName}.rsw`)?.displayName || DB.getMapName(mapName, mapName));
};

/**
 * Clear the end marker
 */
Navigation.clear = function clear() {
	this.stopAutoWalk();
	_navigationRequestId++;
	this.clearPath();
	_finalTargetData = null;
	_targetData = null;
	_selectedTargetData = null;
	_isMapClickTarget = false;
	_pathUnavailable = false;

	// Hide the target coordinates display
	const root = Navigation.getRoot();
	const targetInfo = root.querySelector('.target-info');
	if (targetInfo) {
		targetInfo.style.display = 'none';
	}

	// Update location title with current map name
	const currentMap = getCurrentMap();
	if (currentMap) {
		this.setLocationTitle(currentMap, null);
	}
	this.updateTeleportButton();
	this.updateAutoWalkButtons();
};

Navigation.clearPath = function clearPath() {
	_path = [];
	_lastPathUpdate = 0;
	_pathUpdateLock = false;
};

/**
 * Add a marker to the map
 */
Navigation.addMarker = function addMarker(x, y, color, label) {
	_markers.push({
		x: x,
		y: y,
		color: color || 'rgb(255,0,0)',
		label: label || ''
	});
};

/**
 * Render the map and markers
 */
Navigation.renderCanvas = function renderCanvas(tick) {
	const hostDisplay = this._host ? getComputedStyle(this._host).display : 'none';
	if (hostDisplay === 'none') {
		return;
	}

	const width = 280;
	const height = 230;
	const ctx = _ctx;

	if (!ctx) {
		return;
	}

	// Check if player position has changed
	const currentMap = getCurrentMap();
	const currentPos = getPlayerPosition();
	if (_finalTargetData && !_pathUnavailable && tick - _lastPathUpdate > _pathUpdateThrottle && !_pathUpdateLock) {
		this.navigateTo({
			startMap: currentMap,
			startX: currentPos.x,
			startY: currentPos.y,
			endMap: _finalTargetData.map,
			endX: _finalTargetData.x,
			endY: _finalTargetData.y,
			displayName: _finalTargetData.displayName
		});
		_lastPathUpdate = tick;
	}

	// Clear canvas
	ctx.clearRect(0, 0, width, height);

	// Draw map background
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, width, height);

	// Draw the map image if loaded
	if (_mapData?.ready && _mapImageMap === _mapData.map && _map.complete && _map.width) {
		const scaleX = width / _mapData.width;
		const scaleY = height / _mapData.height;
		const scale = Math.min(scaleX, scaleY);

		ctx.save();
		ctx.translate(width / 2, height / 2);
		ctx.scale(scale, scale);
		ctx.translate(-_mapData.width / 2, -_mapData.height / 2);
		ctx.drawImage(_map, 0, 0, _mapData.width, _mapData.height);
		ctx.restore();
	}

	const mapToScreenBound = (x, y) => {
		return mapToScreen(x, y, width, height);
	};

	if (!_mapData?.ready) return;

	// Draw town info icons
	if (_towninfo && _towninfo.length) {
		for (let i = 0; i < _towninfo.length; i++) {
			const info = _towninfo[i];
			const pos = mapToScreenBound(info.X, info.Y);

			let img;
			switch (info.Type) {
				case 0:
					img = _toolDealer;
					break;
				case 1:
					img = _weaponDealer;
					break;
				case 2:
					img = _armorDealer;
					break;
				case 3:
					img = _blacksmith;
					break;
				case 4:
					img = _guide;
					break;
				case 5:
					img = _inn;
					break;
				case 6:
					img = _kafra;
					break;
				default:
					continue;
			}

			if (img.complete && img.width) {
				ctx.drawImage(img, pos.x - img.width / 2, pos.y - img.height / 2);
			}
		}
	}

	// Draw the path
	if (_path && _path.length > 0) {
		ctx.lineWidth = 2;

		let currentSegment = [];
		for (let i = 0; i < _path.length; i++) {
			const point = _path[i];
			const pos = mapToScreenBound(point.x, point.y);

			if (currentSegment.length === 0) {
				currentSegment.push(pos);
				continue;
			}

			if (point.isWarp || i === _path.length - 1) {
				currentSegment.push(pos);

				ctx.strokeStyle = 'cyan';
				ctx.beginPath();
				ctx.moveTo(currentSegment[0].x, currentSegment[0].y);
				for (let j = 1; j < currentSegment.length; j++) {
					ctx.lineTo(currentSegment[j].x, currentSegment[j].y);
				}
				ctx.stroke();

				if (point.isWarp) {
					ctx.beginPath();
					ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
					ctx.fillStyle = 'yellow';
					ctx.fill();

					if (i + 1 < _path.length) {
						const exitPos = mapToScreenBound(_path[i + 1].x, _path[i + 1].y);

						ctx.beginPath();
						ctx.arc(exitPos.x, exitPos.y, 3, 0, Math.PI * 2);
						ctx.fillStyle = 'yellow';
						ctx.fill();

						currentSegment = [exitPos];
						i++;
					} else {
						currentSegment = [pos];
					}
				} else {
					currentSegment = [pos];
				}
			} else {
				currentSegment.push(pos);
			}
		}
	}

	// Draw end marker (target position)
	if (_targetData) {
		const lastPoint = mapToScreenBound(_targetData.x, _targetData.y);
		ctx.fillStyle = 'red';
		ctx.beginPath();
		ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
		ctx.fill();
	}

	// Draw start marker (player position)
	const startPos = mapToScreenBound(currentPos.x, currentPos.y);
	if (_mapData.map === currentMap && _arrow.complete && _arrow.width) {
		ctx.save();
		ctx.translate(startPos.x, startPos.y);
		ctx.rotate(((Session.Entity.direction + 4) * 45 * Math.PI) / 180);
		ctx.drawImage(_arrow, -_arrow.width / 2, -_arrow.height / 2);
		ctx.restore();
	}

	// Draw custom markers
	for (let i = 0; i < _markers.length; i++) {
		const marker = _markers[i];
		const pos = mapToScreenBound(marker.x, marker.y);

		ctx.fillStyle = marker.color;
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
		ctx.fill();

		if (marker.label) {
			ctx.fillStyle = '#fff';
			ctx.font = '10px Arial';
			ctx.fillText(marker.label, pos.x + 5, pos.y + 3);
		}
	}
};

/**
 * Update the target coordinates text
 */
Navigation.updateTargetText = function updateTargetText(noPathFound) {
	const root = Navigation.getRoot();
	const targetInfo = root.querySelector('.target-info');
	if (targetInfo) {
		targetInfo.style.display = 'flex';
	}

	if (_finalTargetData) {
		this.setTargetCoordinatesText(_finalTargetData.x, _finalTargetData.y, {
			noPathFound: noPathFound,
			targetMap: _finalTargetData.map
		});
	}
};

/**
 * Set target coordinates text with proper formatting
 */
Navigation.setTargetCoordinatesText = function setTargetCoordinatesText(x, y, options) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const text = formatTargetCoordinates(x, y, options);
	const targetCoords = root.querySelector('.target-coordinates');
	if (targetCoords) {
		targetCoords.textContent = text;
		targetCoords.style.display = '';
	}
	const targetInfo = root.querySelector('.target-info');
	if (targetInfo) {
		targetInfo.style.display = 'flex';
	}
};

Navigation.setTargetCoordinatesBlinking = function setTargetCoordinatesBlinking(blinking) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const targetCoordinates = root.querySelector('.target-coordinates');
	if (!targetCoordinates) {
		return;
	}

	if (blinking) {
		if (!_blinking) {
			_blinking = true;
			_originalColor = getComputedStyle(targetCoordinates).color || '#ffffff';

			let fadeStep = 0;
			let fadeDirection = -1;
			_fadeInterval = setInterval(() => {
				fadeStep += fadeDirection * 0.1;

				if (fadeStep <= 0.3) {
					fadeDirection = 1;
				} else if (fadeStep >= 1) {
					fadeDirection = -1;
				}

				targetCoordinates.style.opacity = fadeStep;
			}, 50);
		}
	} else {
		if (_blinking) {
			clearInterval(_fadeInterval);
			_fadeInterval = null;
			targetCoordinates.style.opacity = '1';
			targetCoordinates.style.color = _originalColor;
			_blinking = false;
		}
	}
};

/**
 * Set location title with proper formatting
 */
Navigation.setLocationTitle = function setLocationTitle(currentMap, targetMap, displayName) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const title = formatLocationTitle(currentMap, targetMap, displayName);
	const locationTitle = root.querySelector('.location-title');
	if (locationTitle) {
		locationTitle.textContent = title;
	}
};

/**
 * Set coordinates text with proper formatting
 */
Navigation.setCoordinatesText = function setCoordinatesText(x, y, options) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const text = formatCoordinates(x, y, options);
	const coords = root.querySelector('.coordinates');
	if (coords) {
		coords.textContent = text;
	}
};

/**
 * Set map name text with proper formatting
 */
Navigation.setMapNameText = function setMapNameText(mapName) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const mapNameEl = root.querySelector('.map-name');
	if (mapNameEl) {
		mapNameEl.textContent = normalizeMapName(mapName);
	}
};

/**
 * Set mouse coordinates text with proper formatting
 */
Navigation.setMouseCoordinatesText = function setMouseCoordinatesText(x, y, options) {
	const root = Navigation.getRoot();
	if (!root) {
		return;
	}

	const text = formatCoordinates(x, y, options);
	const mouseCoords = root.querySelector('.mouse-coordinates');
	if (mouseCoords) {
		mouseCoords.textContent = text;
	}
};

/**
 * Find a path between two points using a web worker
 */
Navigation.findPath = function findPath(startX, startY, endX, endY) {
	if (_pathFindingWorker && !_pathUpdateLock) {
		_pathUpdateLock = true;

		const naviLinkTable = DB.getNaviLinkTable();
		const currentMap = getCurrentMap();
		const warps = [];

		if (naviLinkTable && naviLinkTable.length) {
			for (let i = 0; i < naviLinkTable.length; i++) {
				const warp = naviLinkTable[i];
				if (!warp || warp.length < 11) {
					continue;
				}

				const srcMap = warp[0].replace(/\.gat$/, '').toLowerCase();
				const destMap = warp[8].replace(/\.gat$/, '').toLowerCase();

				if (srcMap === currentMap && destMap === currentMap) {
					warps.push({
						id: warp[1],
						type: warp[2],
						srcX: warp[6],
						srcY: warp[7],
						destX: warp[9],
						destY: warp[10]
					});
				}
			}
		}

		_mapData.warps = warps;

		_pathFindingWorker.postMessage({
			type: 'findPath',
			startX: startX,
			startY: startY,
			endX: endX,
			endY: endY,
			mapData: _mapData,
			workerId: _pathFindingWorker.id,
			existingPath: _path
		});
	}
};

/**
 * Toggle the navigation window (show/hide)
 */
Navigation.toggle = function toggle() {
	const hostDisplay = this._host ? getComputedStyle(this._host).display : 'none';
	if (hostDisplay !== 'none') {
		this.hide();
	} else {
		this.show();
	}
};

/**
 * Show the navigation window
 */
Navigation.show = function show() {
	const root = Navigation.getRoot();

	this.clearPath();
	initializePathFindingWorker();

	// Hide coordinate displays initially
	const mouseInfo = root.querySelector('.mouse-info');
	if (mouseInfo) {
		mouseInfo.style.display = 'none';
	}
	const targetInfo = root.querySelector('.target-info');
	if (targetInfo) {
		targetInfo.style.display = 'none';
	}

	const mapName = getCurrentMap();
	const currentPos = getPlayerPosition();

	if (_finalTargetData) {
		this.navigateTo({
			startMap: mapName,
			startX: currentPos.x,
			startY: currentPos.y,
			endMap: _finalTargetData.map,
			endX: _finalTargetData.x,
			endY: _finalTargetData.y,
			displayName: _finalTargetData.displayName
		});
	}

	this.setMapNameText(mapName);

	const locationTitle = root.querySelector('.location-title');
	if (locationTitle && !locationTitle.textContent) {
		this.setLocationTitle(mapName, null);
	}

	this.ui.show();
};

/**
 * Hide the navigation window
 */
Navigation.hide = function hide() {
	this.ui.hide();
	terminatePathFindingWorker();
};

Navigation.onKeyDown = function onKeyDown(event) {
	const hostDisplay = this._host ? getComputedStyle(this._host).display : 'none';
	if ((event.which === KEYS.ESCAPE || event.key === 'Escape') && hostDisplay !== 'none') {
		this.hide();
	}
};

/**
 * Handle mouse movement over the map to display coordinates
 */
Navigation.onMapMouseMove = function onMapMouseMove(event) {
	if (!_mapData?.ready) {
		this.onMapMouseLeave();
		return;
	}

	const root = Navigation.getRoot();
	const mapDisplay = root.querySelector('.map-display');
	const rect = mapDisplay.getBoundingClientRect();
	const x = Math.floor(event.clientX - rect.left);
	const y = Math.floor(event.clientY - rect.top);

	const mapCoords = this.screenToMapCoordinates(x, y);
	const mapX = Math.floor(mapCoords.x);
	const mapY = Math.floor(mapCoords.y);

	const mouseInfo = root.querySelector('.mouse-info');
	if (mouseInfo) {
		mouseInfo.style.display = 'flex';
	}
	this.setMouseCoordinatesText(mapX, mapY);
};

/**
 * Handle mouse leaving the map area
 */
Navigation.onMapMouseLeave = function onMapMouseLeave() {
	const root = Navigation.getRoot();
	const mouseInfo = root.querySelector('.mouse-info');
	if (mouseInfo) {
		mouseInfo.style.display = 'none';
	}
};

/**
 * Set the content of the navigation window based on NAVI info
 */
Navigation.setNaviInfo = function setNaviInfo(naviInfo, displayName) {
	const parts = naviInfo.split(',');
	if (parts.length < 3) {
		return;
	}

	const mapName = parts[0];
	const x = parseInt(parts[1], 10);
	const y = parseInt(parts[2], 10);

	// Clear the search input
	const root = Navigation.getRoot();
	const searchInput = root.querySelector('.search-input');
	if (searchInput) {
		searchInput.value = '';
	}
	_isMapClickTarget = false;

	const currentMap = getCurrentMap();
	const currentPos = getPlayerPosition();

	this.navigateTo({
		startMap: currentMap,
		startX: currentPos.x,
		startY: currentPos.y,
		endMap: mapName,
		endX: x,
		endY: y,
		displayName: displayName
	});
};

/**
 * Wait for map data to be loaded
 */
Navigation.withMapData = function withMapData(mapName, callback) {
	const normalizedMap = normalizeMapName(mapName);
	if (_mapData?.ready && _mapData.map === normalizedMap) {
		callback.call(this, true);
		return;
	}

	this.loadMap(normalizedMap, DB.getMapName(normalizedMap, normalizedMap), ready => {
		callback.call(this, ready);
	});
};

/**
 * Unified navigation function that handles both same-map and cross-map navigation
 */
Navigation.navigateTo = function navigateTo(options) {
	const navigationRequestId = ++_navigationRequestId;
	const root = Navigation.getRoot();
	const startMap = normalizeMapName(options.startMap);
	const endMap = normalizeMapName(options.endMap);
	const displayName = options.displayName;
	const hasCoordinates = Number.isFinite(options.endX) && Number.isFinite(options.endY);
	if (!startMap || !endMap || !hasCoordinates) return;

	if (
		_finalTargetData &&
		(_finalTargetData.map !== endMap || _finalTargetData.x !== options.endX || _finalTargetData.y !== options.endY)
	) {
		this.clearPath();
		resetPathFindingWorker();
		this.setTargetCoordinatesText(options.endX, options.endY, {
			targetMap: endMap
		});
		this.setTargetCoordinatesBlinking(true);
	}
	_pathUnavailable = false;

	_finalTargetData = {
		map: endMap,
		x: options.endX,
		y: options.endY,
		displayName: displayName
	};
	this.updateTeleportButton();
	this.updateAutoWalkButtons();

	// Get warp types based on Services checkbox
	let warpTypes = [200, 201];
	const servicesToggle = root.querySelector('.services-toggle');
	if (servicesToggle && servicesToggle.checked) {
		warpTypes = [200, 201, 202, 203, 204, 205];
	}

	const path = MapPathFinder.findPathBetweenMaps(
		startMap,
		options.startX,
		options.startY,
		endMap,
		options.endX,
		options.endY,
		warpTypes
	);

	if (!path || path.length === 0) {
		_pathUnavailable = true;
		this.stopAutoWalk();
		this.clearPath();
		this.updateTargetText(true);
		this.setTargetCoordinatesBlinking(false);
		this.setLocationTitle(startMap, endMap, displayName);
		return;
	}

	const target = path[0];
	_pathUpdateLock = true;
	this.withMapData(startMap, function (ready) {
		if (navigationRequestId !== _navigationRequestId) return;
		_pathUpdateLock = false;
		if (!ready || !_finalTargetData) {
			_pathUnavailable = true;
			this.stopAutoWalk();
			this.updateTargetText(true);
			this.setTargetCoordinatesBlinking(false);
			return;
		}

		const walkableCell = this.findClosestWalkableCell(target.x, target.y);

		if (walkableCell) {
			_targetData = {
				x: walkableCell.x,
				y: walkableCell.y,
				map: target.map,
				displayName: displayName
			};
			this.findPath(options.startX, options.startY, _targetData.x, _targetData.y);
		} else {
			_pathUnavailable = true;
			this.stopAutoWalk();
			this.clearPath();
			this.updateTargetText(true);
			this.setTargetCoordinatesBlinking(false);
		}
	});
};

/**
 * Create component and export it
 */
export default UIManager.addComponent(Navigation);
