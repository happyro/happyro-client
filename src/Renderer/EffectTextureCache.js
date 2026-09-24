import Client from 'Core/Client.js';
import Configs from 'Core/Configs.js';
import CombatDiagnostics from 'Core/CombatDiagnostics.js';
import Texture from 'Utils/Texture.js';
import { imageTexture } from 'Utils/WebGL.js';

/** Shared image textures for 2D/3D effects. Live leases are never evicted. */
export function createEffectTextureCache({ maxBytes = 16 * 1024 * 1024, maxEntries = 128 } = {}) {
	const contexts = new WeakMap();

	function remove(state, entry, failed = false) {
		state.entries.delete(entry.key);
		state.bytes -= entry.bytes;
		if (entry.texture && !state.gl.isContextLost()) state.gl.deleteTexture(entry.texture);
		entry.texture = null;
		entry.bytes = 0;
		for (const lease of entry.leases) {
			lease.active = false;
			if (failed) lease.onerror();
		}
		entry.leases.clear();
	}

	function trim(state) {
		if (state.entries.size <= maxEntries && state.bytes <= maxBytes) return;
		for (const entry of state.entries.values()) {
			if (entry.leases.size) continue;
			remove(state, entry);
			CombatDiagnostics.count('texture.effectEvict');
			if (state.entries.size <= maxEntries && state.bytes <= maxBytes) break;
		}
	}

	function clear(gl) {
		const state = contexts.get(gl);
		if (!state) return;
		for (const entry of state.entries.values()) remove(state, entry, true);
	}

	function context(gl) {
		let state = contexts.get(gl);
		if (!state) {
			state = { gl, entries: new Map(), bytes: 0 };
			contexts.set(gl, state);
			gl.canvas.addEventListener('webglcontextlost', () => clear(gl));
		}
		return state;
	}

	function request(gl, filename, lease) {
		const state = context(gl);
		const mipmap = Boolean(Configs.get('enableMipmap'));
		const key = `${mipmap ? 1 : 0}:${filename}`;
		let entry = state.entries.get(key);
		const cached = Boolean(entry);
		if (!entry) entry = { key, texture: null, bytes: 0, leases: new Set() };
		// Insertion order tracks recent use without scanning on cache hits.
		state.entries.delete(key);
		state.entries.set(key, entry);
		if (lease) entry.leases.add(lease);
		CombatDiagnostics.count(cached ? 'texture.effectHit' : 'texture.effectMiss');

		const current = () => state.entries.get(key) === entry;
		const fail = () => {
			if (current()) remove(state, entry, true);
		};
		if (gl.isContextLost()) fail();
		else if (cached) {
			if (entry.texture && lease) lease.onload(entry.texture);
		} else {
			Client.loadFile(
				filename,
				buffer => {
					if (!current()) return;
					if (gl.isContextLost()) return fail();
					const start = CombatDiagnostics.begin();
					Texture.load(buffer, function (success) {
						CombatDiagnostics.end(
							buffer instanceof ArrayBuffer ? 'texture.effectDecode' : 'texture.effectDecode.wait',
							start
						);
						if (!current()) return;
						if (!success || gl.isContextLost()) return fail();
						let resource;
						try {
							resource = imageTexture(gl, this, mipmap);
						} catch (error) {
							console.error('Effect texture creation failed:', filename, error);
							fail();
							return;
						}
						entry.texture = resource.texture;
						entry.bytes = resource.bytes;
						state.bytes += resource.bytes;
						CombatDiagnostics.count('texture.effectUpload');
						for (const consumer of entry.leases) consumer.onload(entry.texture);
						trim(state);
					});
				},
				fail
			);
		}
		trim(state);
		return () => {
			if (!lease?.active) return;
			lease.active = false;
			entry.leases.delete(lease);
			trim(state);
		};
	}

	return {
		acquire(gl, filename, onload, onerror) {
			return request(gl, filename, { active: true, onload, onerror });
		},
		preload(gl, filename) {
			request(gl, filename);
		},
		clear
	};
}

export default createEffectTextureCache();
