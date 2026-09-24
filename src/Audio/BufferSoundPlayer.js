/** Short sounds share decoded buffers and one audio graph on every platform. */
const CACHE_BYTES = 32 * 1024 * 1024;
const CACHE_ENTRIES = 128;
const MAX_LOADS = 4;
const MAX_VOICES = 32;
const MAX_SOUND_VOICES = 8;
const SAME_SOUND_MS = 30;
const MAX_START_AGE_MS = 250;

export default class BufferSoundPlayer {
	constructor({ load, diagnostics, now = () => performance.now() }) {
		this.load = load;
		this.diagnostics = diagnostics;
		this.now = now;
		this.context = null;
		this.output = null;
		this.volume = 1;
		this.cache = new Map();
		this.cacheBytes = 0;
		this.voices = new Set();
		this.loading = 0;
	}

	/** Called from a user gesture, and again after a page/audio interruption. */
	activate() {
		if (!this.context) {
			this.context = new AudioContext({ latencyHint: 'interactive' });
			this.output = this.context.createGain();
			this.output.gain.value = this.volume;
			this.output.connect(this.context.destination);
			this.context.onstatechange = () => {
				if (this.context.state !== 'running') {
					this.stop();
				}
				this.diagnostics.mark('audio.context', {
					engine: 'webaudio',
					state: this.context.state,
					sampleRate: this.context.sampleRate
				});
			};
		}
		// A blocked resume attempt needs a fresh call inside the next user gesture.
		if (this.context.state !== 'running') {
			return this.context.resume().catch(error => {
				this.diagnostics.mark('audio.resume-rejected', { name: error.name });
			});
		}
		return Promise.resolve();
	}

	setVolume(volume) {
		this.volume = volume;
		if (this.output) {
			this.output.gain.value = volume;
		}
	}

	preload(filename) {
		if (!filename || filename === 'atk' || !this.context) {
			return;
		}
		this.entry(filename);
		this.pump();
	}

	play(filename, volume = 1, priority = false) {
		if (!filename || volume <= 0 || this.volume <= 0 || this.context?.state !== 'running') {
			return;
		}
		const entry = this.entry(filename);
		if (!entry) {
			return;
		}
		const request = { volume, priority, at: this.now() };
		if (entry.buffer) {
			this.start(entry, request);
		} else {
			// Loading must never accumulate a burst of delayed playback requests.
			if (!entry.pending?.priority || priority) {
				entry.pending = request;
			}
			this.pump();
		}
	}

	entry(filename) {
		let entry = this.cache.get(filename);
		if (entry) {
			this.cache.delete(filename);
			this.cache.set(filename, entry);
			return entry;
		}
		if (!this.makeRoom(0, true)) {
			return null;
		}
		entry = {
			filename,
			buffer: null,
			bytes: 0,
			loading: false,
			retryAt: 0,
			pending: null,
			lastStart: -Infinity,
			lastPriorityStart: -Infinity,
			voices: new Set()
		};
		this.cache.set(filename, entry);
		return entry;
	}

	makeRoom(bytes, addingEntry = false, keep = null) {
		for (const [filename, entry] of this.cache) {
			if (this.cacheBytes + bytes <= CACHE_BYTES && this.cache.size + Number(addingEntry) <= CACHE_ENTRIES) {
				return true;
			}
			if (entry === keep || entry.loading || entry.pending || entry.voices.size) {
				continue;
			}
			this.cache.delete(filename);
			this.cacheBytes -= entry.bytes;
		}
		return this.cacheBytes + bytes <= CACHE_BYTES && this.cache.size + Number(addingEntry) <= CACHE_ENTRIES;
	}

	pump() {
		// Pending playback takes precedence over speculative warming.
		const entries = [...this.cache.values()].sort((a, b) => Number(!!b.pending) - Number(!!a.pending));
		for (const entry of entries) {
			if (this.loading >= MAX_LOADS) {
				break;
			}
			if (entry.buffer || entry.loading || entry.retryAt > this.now()) {
				continue;
			}
			entry.loading = true;
			this.loading++;
			this.prepare(entry);
		}
	}

	async prepare(entry) {
		try {
			const loadAt = this.diagnostics.begin();
			const data = await this.load(entry.filename);
			this.diagnostics.end('audio.load.wait', loadAt);
			const decodeAt = this.diagnostics.begin();
			const buffer = await this.context.decodeAudioData(data);
			this.diagnostics.end('audio.decode.wait', decodeAt);
			const bytes = buffer.length * buffer.numberOfChannels * 4;
			if (bytes > CACHE_BYTES || !this.makeRoom(bytes, false, entry)) {
				throw new Error('Decoded sound cache is full');
			}
			entry.buffer = buffer;
			entry.bytes = bytes;
			this.cacheBytes += bytes;
			if (entry.pending && this.now() - entry.pending.at <= MAX_START_AGE_MS) {
				this.start(entry, entry.pending);
			}
		} catch (error) {
			entry.retryAt = this.now() + 30000;
			console.warn('[SoundManager] Cannot prepare sound:', entry.filename, error);
		} finally {
			entry.pending = null;
			entry.loading = false;
			this.loading--;
			this.pump();
		}
	}

	start(entry, request) {
		if (this.context.state !== 'running' || this.volume <= 0) {
			return;
		}
		const at = this.now();
		const lastStart = request.priority ? entry.lastPriorityStart : entry.lastStart;
		if (at - lastStart < SAME_SOUND_MS) {
			return;
		}
		const candidates = entry.voices.size >= MAX_SOUND_VOICES ? entry.voices : this.voices;
		if (entry.voices.size >= MAX_SOUND_VOICES || this.voices.size >= MAX_VOICES) {
			const victim = [...candidates].find(voice => !voice.priority);
			if (!request.priority || !victim) {
				return;
			}
			this.release(victim, true);
		}
		const startAt = this.diagnostics.begin();
		const source = this.context.createBufferSource();
		const gain = this.context.createGain();
		const voice = { source, gain, entry, priority: request.priority };
		try {
			source.buffer = entry.buffer;
			gain.gain.value = request.volume;
			source.connect(gain);
			gain.connect(this.output);
			source.onended = () => this.release(voice);
			source.start();
			entry.lastStart = at;
			if (request.priority) {
				entry.lastPriorityStart = at;
			}
			entry.voices.add(voice);
			this.voices.add(voice);
		} catch (error) {
			source.disconnect();
			gain.disconnect();
			console.warn('[SoundManager] Cannot start sound:', error);
		} finally {
			this.diagnostics.end('audio.start', startAt);
		}
	}

	release(voice, stop = false) {
		voice.source.onended = null;
		if (stop) {
			voice.source.stop();
		}
		voice.source.disconnect();
		voice.gain.disconnect();
		voice.source.buffer = null;
		voice.entry.voices.delete(voice);
		this.voices.delete(voice);
	}

	stop(filename) {
		for (const entry of this.cache.values()) {
			if (!filename || filename === entry.filename) {
				entry.pending = null;
				entry.lastStart = entry.lastPriorityStart = -Infinity;
				for (const voice of entry.voices) {
					this.release(voice, true);
				}
			}
		}
	}

	suspend() {
		this.stop();
		if (this.context && this.context.state !== 'closed') {
			return this.context.suspend().catch(error => {
				this.diagnostics.mark('audio.suspend-rejected', { name: error.name });
			});
		}
		return Promise.resolve();
	}
}
