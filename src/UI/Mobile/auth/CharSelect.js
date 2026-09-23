/**
 * UI/Mobile/auth/CharSelect.js
 *
 * Mobile character-select screen. Presentation-only: data logic lives in
 * Components/CharSelect/CharSelectCommon.js (shared with desktop).
 *
 * CharSelectCommon (V4 grid path) writes directly into these class names:
 *   .job .lvl .map .exp .hp .sp .str .agi .vit .int .dex .luk (via charinfo.querySelector)
 *   .ok .delete .canceldelete .finaldelete (via style.display)
 *   #slot0…#slot14 .name (via slot canvas)
 * The class contract must be preserved exactly.
 */

import { createCharSelect } from 'UI/Components/CharSelect/CharSelectCommon.js';
import { withMobileShell } from '../Shell.js';
import tokens from '../tokens.css?raw';
import shellCSS from '../Shell.css?raw';
import screenCSS from './CharSelect.css?raw';
import rawHTML from './CharSelect.html?raw';

const slots = Array.from(
	{ length: 15 },
	(_, i) => `
	<button class="char_canvas" id="slot${i}" type="button" aria-label="角色栏 ${i + 1}">
		<canvas width="157" height="195"></canvas>
		<span class="name"></span>
		<span class="timedelete slot${i} hidden"></span>
	</button>`
).join('');

const htmlText = rawHTML.replace('CHAR_SLOTS_PLACEHOLDER', slots);

export default withMobileShell(
	createCharSelect({
		name: 'MobileCharSelect',
		htmlText,
		cssText: tokens + shellCSS + screenCSS,
		gridLayout: true,
		deleteReservation: true,
		defaultMaxSlots: 15,
		activationEvent: 'click',
		bitmapSkin: false,
		onSelectionChange(root, { index, character, maxSlots }) {
			root.querySelectorAll('.char_canvas').forEach((slot, i) => {
				slot.hidden = i >= maxSlots;
				slot.setAttribute('aria-pressed', String(i === index));
			});
			root.querySelector('.selection-label').textContent =
				character?.name || (index < maxSlots ? `角色栏 ${index + 1}` : '');
			// Engine controls .ok/.delete via style.display.
			// .make is not managed by the engine in grid mode, so we handle it here.
			root.querySelector('.make').hidden = !!character;
		},
	})
);
