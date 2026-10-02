import { afterEach } from 'vitest';

// Node-only suites have no DOM; renderer suites may replace document with a stub.
const body = globalThis.document?.body;
if (body) {
 // jsdom has no top layer; native focus/inert behavior is checked in real browsers.
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 afterEach(() => body.replaceChildren());
}
