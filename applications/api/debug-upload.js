const BASE = '/api/client-diagnostics';
const MAX_QUEUE = 512 * 1024;
const MAX_BATCH = 32 * 1024;
const encoder = new TextEncoder();

/** Bounded, acknowledged batches. Use the original fetch to avoid logging our own uploads. */
export function createDiagnosticsUpload({
	fetch,
	beacon,
	sanitize = value => value,
	onState = () => {},
	now = Date.now
}) {
	let queue = [],
		bytes = 0,
		dropped = 0,
		session = null,
		sequence = 1;
	let pending = null,
		busy = false,
		stopped = false,
		retryAt = 0,
		failures = 0;
	function enqueue(entry) {
		if (stopped) return;
		const line = JSON.stringify(entry);
		const size = encoder.encode(line).length;
		if (size > 8192) {
			dropped++;
			return;
		}
		while (queue.length && (bytes + size > MAX_QUEUE || queue.length >= 1000)) {
			bytes -= queue.shift().size;
			dropped++;
		}
		queue.push({ line, size });
		bytes += size;
	}
	function batch() {
		if (pending || !queue.length) return pending;
		const entries = [];
		let size = 0;
		while (queue.length && entries.length < 100 && size + queue[0].size < MAX_BATCH) {
			const item = queue.shift();
			bytes -= item.size;
			size += item.size;
			entries.push(item.line);
		}
		pending = { sequence, body: sanitize(`{"sequence":${sequence},"entries":[${entries.join(',')}]}`) };
		return pending;
	}
	async function post(url, body) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		try {
			return await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
				signal: controller.signal,
				credentials: 'same-origin',
				cache: 'no-store',
				keepalive: true
			});
		} finally {
			clearTimeout(timeout);
		}
	}
	async function flush() {
		if (busy || stopped || now() < retryAt) return;
		busy = true;
		try {
			if (!session) {
				const response = await post(`${BASE}/sessions`, '{}');
				if ([403, 404, 507].includes(response.status)) {
					stopped = true;
					queue = [];
					bytes = 0;
					onState(response.status === 507 ? '接收目录已达上限' : '本机未开启日志接收');
					return;
				}
				if (!response.ok) throw new Error('Session unavailable');
				const result = await response.json();
				if (!/^[a-f0-9-]{36}$/.test(result.session)) throw new Error('Invalid session');
				session = result.session;
				onState(`已连接 · ${session.slice(0, 8)}`);
			}
			const current = batch();
			if (!current) return;
			const response = await post(`${BASE}/sessions/${session}/events`, current.body);
			if (response.status === 404) {
				// Receiver restarted: preserve the unacknowledged batch in a new session.
				session = null;
				sequence = 1;
				pending = { sequence: 1, body: current.body.replace(/^\{"sequence":\d+/, '{"sequence":1') };
				throw new Error('Session expired');
			}
			if ([400, 403, 409, 413, 507].includes(response.status)) {
				stopped = true;
				queue = [];
				bytes = 0;
				pending = null;
				onState(`回传停止（HTTP ${response.status}）`);
				return;
			}
			if (!response.ok) throw new Error('Upload unavailable');
			pending = null;
			sequence++;
			failures = 0;
			onState(`已回传 · ${session.slice(0, 8)} · 批次 ${sequence - 1}${dropped ? ` · 丢弃 ${dropped} 条` : ''}`);
		} catch {
			retryAt = now() + Math.min(30000, 1000 * 2 ** Math.min(++failures, 5));
			onState('连接中断，稍后自动重试');
		} finally {
			busy = false;
		}
	}
	function pagehide() {
		if (!session || stopped) return;
		const current = batch();
		if (current)
			beacon?.(`${BASE}/sessions/${session}/events`, new Blob([current.body], { type: 'application/json' }));
		// No acknowledgement from sendBeacon: keep the batch for a deduplicated retry on pageshow.
	}
	return { enqueue, flush, pagehide };
}
