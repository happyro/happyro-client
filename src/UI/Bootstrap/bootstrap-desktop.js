/**
 * UI/Bootstrap/bootstrap-desktop.js
 *
 * Register all desktop UI components.
 * Import and call init() once at app startup, before any UIManager.getComponent() call.
 */

import UIManager from 'UI/UIManager.js';

// ─── Core ──────────────────────────────────────────────────────────────────

import Intro from 'UI/Components/Intro/Intro.js';

// ─── Register ─────────────────────────────────────────────────────────────

export function init() {
	UIManager.addComponent(Intro);
	// Add remaining desktop components here as the project grows.
}
