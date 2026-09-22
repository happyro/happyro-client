/**
 * Network/SocketHelpers/WebSocket.js
 *
 * HTML5 WebSocket if the server support the protocole
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

/**
 * HTML5 WebSocket System
 *
 * @param {string} url
 */
function Socket(host, port, proxy) {
	let url = 'ws://' + host + ':' + port + '/';
	const self = this;
	this.connected = false;
	this.closing = false;
	let completed = false;

	function complete(success) {
		if (completed || self.closing) {
			return;
		}
		completed = true;
		self.onComplete(success);
	}

	// Use of a proxy
	if (proxy) {
		url = proxy;

		if (!url.match(/\/$/)) {
			url += '/';
		}

		url += host + ':' + port;
	}

	// Open Websocket
	this.ws = new WebSocket(url);
	this.ws.binaryType = 'arraybuffer';

	this.ws.onopen = function OnOpen() {
		if (self.closing) {
			return;
		}
		self.connected = true;
		complete(true);
	};

	this.ws.onerror = function OnError() {
		complete(false);
	};

	this.ws.onmessage = function OnMessage(event) {
		self.onMessage(event.data);
	};

	this.ws.onclose = function OnClose() {
		self.connected = false;
		complete(false);

		if (self.onClose && !self.closing) {
			self.onClose();
		}
	};
}

/**
 * Sending packet to applet
 *
 * @param {ArrayBuffer} buffer
 */
Socket.prototype.send = function Send(buffer) {
	if (this.connected) {
		this.ws.send(buffer);
		return true;
	}
	return false;
};

/**
 * Closing connection to server
 */
Socket.prototype.close = function Close() {
	this.closing = true;
	this.connected = false;
	if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
		this.ws.close();
	}
};

/**
 * Export
 */
export default Socket;
