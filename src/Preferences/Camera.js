/**
 * Preferences/Camera.js
 *
 * Camera user preferences
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

import Preferences from 'Core/Preferences.js';
import Platform from 'UI/Platform.js';

export const DEFAULT_CAMERA_ZOOM = Platform.isMobile ? 110 : 125;

/**
 * Export
 */
export default Preferences.get(
	'Camera',
	{
		smooth: true,
		zoom: DEFAULT_CAMERA_ZOOM,
		indoorZoom: DEFAULT_CAMERA_ZOOM
	},
	1.1
);
