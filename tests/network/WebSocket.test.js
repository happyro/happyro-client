import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Socket from '../../src/Network/SocketHelpers/WebSocket.js';

class FakeWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	constructor(url) {
		this.url = url;
		this.readyState = 0;
		this.close = vi.fn(() => { this.readyState = 2; });
		this.send = vi.fn();
	}
	open() { this.readyState = 1; this.onopen(); }
	error() { this.onerror(); }
	closed() { this.readyState = 3; this.onclose(); }
}

function connect() {
	const socket = new Socket('192.168.8.39', 6900, 'ws://192.168.8.39:3338/ws/');
	socket.onComplete = vi.fn();
	socket.onClose = vi.fn();
	return socket;
}

beforeEach(() => vi.stubGlobal('WebSocket', FakeWebSocket));
afterEach(() => vi.unstubAllGlobals());

describe('WebSocket connection lifecycle', () => {
	it('does not report failure when the old login socket errors after an intentional close', () => {
		const login = connect();
		login.ws.open();
		const character = connect();
		character.ws.open();
		login.close();
		login.ws.error();
		login.ws.closed();
		expect(login.onComplete.mock.calls).toEqual([[true]]);
		expect(login.onClose).not.toHaveBeenCalled();
		expect(login.ws.close).toHaveBeenCalledOnce();
		expect(character.connected).toBe(true);
		expect(character.onComplete.mock.calls).toEqual([[true]]);
	});

	it('reports a failed handshake once when error is followed by close', () => {
		const socket = connect();
		socket.ws.error();
		socket.ws.closed();
		expect(socket.onComplete.mock.calls).toEqual([[false]]);
		expect(socket.connected).toBe(false);
	});

	it('reports a handshake closed without an error event as a failure', () => {
		const socket = connect();
		socket.ws.closed();
		expect(socket.onComplete.mock.calls).toEqual([[false]]);
	});

	it('still delivers a real disconnect after a successful connection', () => {
		const socket = connect();
		socket.ws.open();
		socket.ws.error();
		socket.ws.closed();
		expect(socket.onComplete.mock.calls).toEqual([[true]]);
		expect(socket.onClose).toHaveBeenCalledOnce();
		expect(socket.connected).toBe(false);
		expect(socket.send(new Uint8Array([1]))).toBe(false);
	});

	it('cancels a pending handshake without reporting a login failure', () => {
		const socket = connect();
		socket.close();
		socket.close();
		socket.ws.error();
		socket.ws.closed();
		expect(socket.ws.close).toHaveBeenCalledOnce();
		expect(socket.onComplete).not.toHaveBeenCalled();
		expect(socket.onClose).not.toHaveBeenCalled();
	});
});
