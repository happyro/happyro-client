/* Early, opt-in diagnostics. Loaded before configuration and application modules. */
(function () {
	'use strict';
	if (new URLSearchParams(location.search).get('debug') !== '1' || window.happyroDebug) return;
	const nativeFetch = window.fetch.bind(window);
	let upload;
	let uploadState = '正在连接本机日志接收端';
	const LIMIT = 1000;
	const entries = [];
	const secrets = new Map();
	const sockets = new Map();
	let enabled = true;
	let nextSocket = 0;
	let renderTimer;
	let panel, output, counter, toggle, status, tab;

	function safeURL(value) {
		try { const url = new URL(value, location.href); return url.origin + url.pathname; }
		catch { return '[invalid URL]'; }
	}
	function scrub(value) {
		let text = String(value).slice(0, 3000);
		text = text.replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, safeURL);
		text = text.replace(/((?:password|passwd|username|token|authorization|cookie|secret|session)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]');
		for (const secret of secrets.values()) {
			if (secret.length >= 3) text = text.split(secret).join('[redacted]');
			else if (text === secret) text = '[redacted]';
		}
		return text;
	}
	function argument(value) {
		if (value instanceof Error) return scrub(`${value.name}: ${value.message}\n${value.stack || ''}`);
		if (value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)) return scrub(value);
		// Never serialize arbitrary objects, headers, configurations or packet contents.
		if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return `[binary ${value.byteLength} bytes]`;
		return Array.isArray(value) ? `[array ${value.length}]` : '[object]';
	}
	function text() { return entries.map(entry => scrub(JSON.stringify(entry))).join('\n'); }
	function render() {
		renderTimer = undefined;
		if (!panel || panel.hidden) return;
		if (output.getRootNode().activeElement !== output) output.value = text();
		counter.textContent = `${enabled ? '记录中' : '已关闭'} · ${entries.length}/${LIMIT} 条`;
	}
	function record(event, details = {}) {
		if (!enabled) return;
		entries.push({ time: new Date().toISOString(), elapsedMs: Math.round(performance.now()), event, ...details });
		if (entries.length > LIMIT) entries.shift();
		upload?.enqueue(entries.at(-1));
		if (panel && !panel.hidden && !renderTimer) renderTimer = setTimeout(render, 250);
	}
	function snapshot(event) {
		record(event, {
			ready: document.readyState, visible: document.visibilityState, online: navigator.onLine,
			width: innerWidth, height: innerHeight, visualHeight: window.visualViewport?.height,
			offsetTop: window.visualViewport?.offsetTop,
			screens: ['ro-preloader', 'MobileWinLogin', 'WinLogin', 'WinLoading', 'MobileCharSelect', 'CharSelect', 'MobileCharCreate'].filter(id => document.getElementById(id)),
			sockets: [...sockets.values()].map(item => ({ id: item.id, url: item.url, state: item.socket.readyState, sent: item.sent, received: item.received, ageMs: Math.round(performance.now() - item.started) }))
		});
	}
	function environment() {
		record('debug.enabled', { build: document.querySelector('meta[name="happyro-build-id"]')?.content || 'development', userAgent: navigator.userAgent, page: safeURL(location.href), secureContext: window.isSecureContext, dpr: window.devicePixelRatio, coarsePointer: matchMedia('(pointer: coarse)').matches });
		snapshot('page.snapshot');
	}
	function setEnabled(value) {
		enabled = value;
		if (toggle) toggle.checked = value;
		if (tab) tab.textContent = value ? '日志 · 开' : '日志';
		if (value) environment();
		render();
	}
	window.happyroDebug = { setEnabled, export: text, get enabled() { return enabled; },
		recordPerformance: (event, details) => record(event, details) };
	window.happyroDiagnostic = (event, details = {}) => record('app.stage', {
		name: scrub(event), stage: scrub(details.stage || ''), message: scrub(details.message || '')
	});

	// Keep entered values only for redaction, never export them. Shadow DOM inputs included.
	const rememberInput = event => {
		const input = event.composedPath()[0];
		if (input instanceof HTMLInputElement && ['text', 'password', 'email', 'tel'].includes(input.type) && input.value) {
			secrets.set(input, input.value);
			if (secrets.size > 32) secrets.delete(secrets.keys().next().value);
		}
	};
	document.addEventListener('input', rememberInput, true);
	document.addEventListener('change', rememberInput, true);
	document.addEventListener('click', event => {
		const target = event.composedPath()[0];
		if (target instanceof Element && !event.composedPath().some(node => node.id === 'happyro-debug')) record('ui.click', { tag: target.tagName, id: scrub(target.id), classes: scrub(typeof target.className === 'string' ? target.className : '') });
	}, true);
	for (const level of ['log', 'info', 'warn', 'error']) {
		const original = console[level];
		console[level] = function (...args) {
			if (enabled) record(`console.${level}`, { arguments: args.slice(0, 8).map(argument) });
			return original.apply(this, args);
		};
	}
	window.addEventListener('error', event => {
		if (event.target !== window) record('resource.error', { tag: event.target.tagName, url: safeURL(event.target.src || event.target.href || '') });
		else record('javascript.error', { message: scrub(event.message), file: safeURL(event.filename || ''), line: event.lineno, column: event.colno, stack: event.error ? argument(event.error) : '' });
	}, true);
	window.addEventListener('unhandledrejection', event => record('promise.rejection', { reason: argument(event.reason) }));

	const NativeSocket = window.WebSocket;
	if (NativeSocket) window.WebSocket = new Proxy(NativeSocket, {
		construct(Target, args) {
			const id = ++nextSocket;
			const url = safeURL(args[0]);
			record('ws.create', { id, url });
			let socket;
			try { socket = new Target(...args); }
			catch (error) { record('ws.constructor-error', { id, error: argument(error) }); throw error; }
			const item = { id, url, socket, started: performance.now(), sent: 0, received: 0 };
			sockets.set(id, item);
			socket.addEventListener('open', () => record('ws.open', { id, elapsed: Math.round(performance.now() - item.started), protocol: socket.protocol, extensions: socket.extensions }));
			socket.addEventListener('error', () => record('ws.error', { id, state: socket.readyState }));
			socket.addEventListener('close', event => { record('ws.close', { id, code: event.code, clean: event.wasClean, sent: item.sent, received: item.received }); sockets.delete(id); });
			const size = data => typeof data === 'string' ? new Blob([data]).size : data?.byteLength ?? data?.size ?? 0;
			socket.addEventListener('message', event => { const bytes = size(event.data); item.received += bytes; });
			const send = socket.send;
			socket.send = function (data) {
				const result = send.call(this, data);
				const bytes = size(data); item.sent += bytes; return result;
			};
			return socket;
		}
	});
	if (window.fetch) {
		const fetch = window.fetch;
		window.fetch = function (...args) {
			const url = safeURL(typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0].url);
			const start = performance.now();
			record('fetch.start', { url });
			const result = fetch.apply(this, args);
			result.then(response => record('fetch.end', { url, status: response.status, elapsed: Math.round(performance.now() - start) }), error => record('fetch.error', { url, error: argument(error) }));
			return result;
		};
	}
	const requests = new WeakMap();
	const open = XMLHttpRequest.prototype.open;
	const send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.open = function (method, url, ...rest) {
		requests.set(this, { method: String(method), url: safeURL(url) });
		return open.call(this, method, url, ...rest);
	};
	XMLHttpRequest.prototype.send = function (...args) {
		const details = requests.get(this) || {};
		const started = performance.now();
		record('xhr.start', details);
		this.addEventListener('loadend', () => record('xhr.end', { ...details, status: this.status, elapsed: Math.round(performance.now() - started) }), { once: true });
		return send.apply(this, args);
	};
	if (window.PerformanceObserver) {
		try {
			new PerformanceObserver(list => {
				for (const resource of list.getEntries()) if (!['fetch', 'xmlhttprequest'].includes(resource.initiatorType)) record('resource.loaded', { url: safeURL(resource.name), type: resource.initiatorType, duration: Math.round(resource.duration), bytes: resource.transferSize });
			}).observe({ type: 'resource', buffered: true });
		} catch { /* Resource timing is optional. */ }
	}
	for (const name of ['load', 'pageshow', 'pagehide', 'online', 'offline', 'orientationchange']) window.addEventListener(name, () => snapshot(`page.${name}`));
	document.addEventListener('visibilitychange', () => snapshot('page.visibility'));
	window.visualViewport?.addEventListener('resize', () => snapshot('viewport.resize'));
	setInterval(() => { if (enabled) snapshot('heartbeat'); }, 5000);

	function mount() {
		const host = document.createElement('div');
		host.id = 'happyro-debug';
		// A manual popover keeps the tab accessible above game dialogs without stealing focus.
		host.setAttribute('popover', 'manual');
		host.style.cssText = 'position:fixed;inset:0;margin:0;border:0;padding:0;width:100%;height:100%;max-width:none;max-height:none;background:transparent;pointer-events:none;overflow:visible;z-index:2147483647';
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = `<style>
			:host{font:14px/1.5 system-ui;color:#263547}*{box-sizing:border-box}button,input,textarea{font:inherit}button{border:1px solid #bdcbd8;border-radius:8px;background:#fff;color:#263547;padding:9px 12px;touch-action:manipulation}button:active{background:#e5edf5}.tab{pointer-events:auto;position:absolute;right:0;top:50%;transform:translateY(-50%);border-radius:10px 0 0 10px;padding:14px 7px;writing-mode:vertical-rl;letter-spacing:2px;box-shadow:0 2px 10px #0002}section{pointer-events:auto;position:absolute;right:0;top:50%;transform:translateY(-50%);width:min(440px,100%);max-height:90%;overflow:auto;background:#f5f8fc;border:1px solid #bdcbd8;border-radius:14px 0 0 14px;padding:14px;padding-right:max(14px,env(safe-area-inset-right));box-shadow:0 4px 30px #0003}section[hidden],button[hidden]{display:none}header,nav{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap}label{display:flex;align-items:center;gap:8px}input{width:20px;height:20px}textarea{width:100%;height:34vh;min-height:80px;resize:none;overflow:auto;font:12px/1.4 monospace;margin:8px 0;white-space:pre}p{margin:8px 0;font-size:12px}strong{font-size:16px}
		</style><button class="tab" aria-label="打开日志侧栏">日志</button><section hidden aria-label="前端日志"><header><strong>前端日志</strong><label><input type="checkbox">记录日志</label><button data-hide>收起</button></header><p data-count></p><p>调试模式已启用；取消勾选可暂停记录，移除网址 debug 参数并刷新可关闭工具。启用接收端时自动回传到本机；自动隐藏输入值，不记录封包正文。</p><p data-upload></p><textarea readonly aria-label="日志内容" spellcheck="false"></textarea><nav><button data-copy>复制日志</button><button data-save>下载日志</button><button data-snapshot>记录当前状态</button><button data-mark>标记卡顿</button><button data-clear>清空</button></nav><p role="status" aria-live="polite"></p></section>`;
		panel = root.querySelector('section'); output = root.querySelector('textarea'); toggle = root.querySelector('input'); status = root.querySelector('[role=status]'); tab = root.querySelector('.tab'); counter = root.querySelector('[data-count]');
		root.querySelector('[data-upload]').textContent = uploadState;
		toggle.checked = enabled; tab.textContent = enabled ? '日志 · 开' : '日志';
		tab.onclick = () => { panel.hidden = false; tab.hidden = true; render(); };
		root.querySelector('[data-hide]').onclick = () => { panel.hidden = true; tab.hidden = false; };
		toggle.onchange = () => { setEnabled(toggle.checked); status.textContent = enabled ? '已开启，日志立即显示。' : '已停止记录，已有日志仍可复制。'; };
		root.querySelector('[data-snapshot]').onclick = () => { snapshot('manual.snapshot'); render(); status.textContent = enabled ? '已记录当前状态。' : '请先开启记录日志。'; };
		root.querySelector('[data-mark]').onclick = () => { record('perf.manual-stutter'); status.textContent = '已标记卡顿时间'; };
		root.querySelector('[data-clear]').onclick = () => { entries.length = 0; if (enabled) environment(); render(); };
		output.addEventListener('blur', () => setTimeout(render, 0));
		root.querySelector('[data-copy]').onclick = async () => {
			const content = text();
			// Keep selection and the synchronous copy inside the original user gesture
			// when Clipboard API is unavailable on a LAN HTTP origin.
			const copySelection = () => {
				output.value = content;
				output.focus({ preventScroll: true });
				output.select();
				output.setSelectionRange(0, content.length);
				try { return document.execCommand('copy'); } catch { return false; }
			};
			let copied = false;
			if (navigator.clipboard?.writeText) {
				try { await navigator.clipboard.writeText(content); copied = true; }
				catch { copied = copySelection(); }
			} else {
				copied = copySelection();
			}
			status.textContent = copied
				? `已复制全部日志（${content.length} 字符）。`
				: '浏览器拒绝了复制，已选中全部日志。请长按选择复制，或下载日志。';
		};
		root.querySelector('[data-save]').onclick = () => {
			const url = URL.createObjectURL(new Blob([text()], { type: 'text/plain;charset=utf-8' }));
			const link = document.createElement('a'); link.href = url; link.download = 'happyro-debug.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
		};
		for (const type of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup']) host.addEventListener(type, event => event.stopPropagation(), { passive: true });
		document.body.append(host);
		if (host.showPopover) host.showPopover(); else host.removeAttribute('popover');
		// Native modal dialogs enter the top layer later. Re-show this nonmodal tool above them.
		document.addEventListener('toggle', event => {
			if (event.target instanceof HTMLDialogElement && event.newState === 'open' && host.showPopover) { host.hidePopover(); host.showPopover(); }
		}, true);
		new MutationObserver(records => {
			for (const mutation of records) for (const [action, nodes] of [['show', mutation.addedNodes], ['hide', mutation.removedNodes]]) {
				for (const node of nodes) if (node instanceof Element && /^(?:Mobile|Win|Char|ro-preloader)/.test(node.id)) record('ui.' + action, { id: node.id });
			}
		}).observe(document.body, { childList: true });
		snapshot('debug.ready');
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
	if (enabled) environment();
	import('./debug-upload.js').then(({ createDiagnosticsUpload }) => {
		upload = createDiagnosticsUpload({ fetch: nativeFetch, beacon: navigator.sendBeacon?.bind(navigator), sanitize: value => JSON.stringify(JSON.parse(value), (_key, item) => typeof item === 'string' ? scrub(item) : item),
			onState: value => {
				uploadState = value;
				const label = panel?.querySelector('[data-upload]');
				if (label) label.textContent = value;
			} });
		for (const entry of entries) upload.enqueue(entry);
		void upload.flush();
		setInterval(() => { void upload.flush(); }, 2000);
		window.addEventListener('pagehide', () => upload.pagehide());
		document.addEventListener('visibilitychange', () => { if (document.hidden) upload.pagehide(); });
	}).catch(() => { uploadState = '回传模块加载失败'; });
})();
