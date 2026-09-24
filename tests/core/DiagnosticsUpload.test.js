import { expect, it, vi } from 'vitest';
import { createDiagnosticsUpload } from '../../applications/api/debug-upload.js';

const id = '11111111-1111-4111-8111-111111111111';
const entry = { event: 'perf.frame-gap', elapsedMs: 100, time: '2026-09-24T12:00:00Z', intervalMs: 80 };
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

it('retries the exact unacknowledged batch and leaves newer entries for the next sequence', async () => {
	let now = 0;
	const fetch = vi.fn().mockResolvedValueOnce(response(201, { session: id }))
		.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValue(response(204));
	const upload = createDiagnosticsUpload({ fetch, now: () => now });
	upload.enqueue(entry);
	await upload.flush();
	upload.enqueue({ ...entry, intervalMs: 120 });
	await upload.flush();
	expect(fetch).toHaveBeenCalledTimes(2);
	now = 10000;
	await upload.flush();
	expect(fetch.mock.calls[2][1].body).toBe(fetch.mock.calls[1][1].body);
	await upload.flush();
	expect(JSON.parse(fetch.mock.calls[3][1].body)).toMatchObject({ sequence: 2, entries: [{ intervalMs: 120 }] });
});

it('bounds queued events and sanitizes outgoing batches including a pagehide beacon', async () => {
	const fetch = vi.fn().mockResolvedValueOnce(response(201, { session: id })).mockResolvedValue(response(204));
	const beacon = vi.fn();
	const upload = createDiagnosticsUpload({ fetch, beacon, sanitize: text => text.replaceAll('private-value', '[redacted]') });
	for (let i = 0; i < 2000; i++) upload.enqueue({ ...entry, elapsedMs: i, message: 'private-value' });
	await upload.flush();
	const sent = JSON.parse(fetch.mock.calls[1][1].body);
	expect(sent.entries[0].elapsedMs).toBe(1000);
	expect(sent.entries[0].message).toBe('[redacted]');
	expect(sent.entries.length).toBeLessThanOrEqual(100);
	upload.pagehide();
	expect(beacon.mock.calls[0][0]).toContain(`/sessions/${id}/events`);
	await upload.flush();
	expect(JSON.parse(fetch.mock.calls[2][1].body).sequence).toBe(2);
});

it('stops contacting a disabled collector and resumes a lost receiver session', async () => {
	const disabled = vi.fn().mockResolvedValue(response(404));
	const upload = createDiagnosticsUpload({ fetch: disabled });
	await upload.flush(); await upload.flush();
	expect(disabled).toHaveBeenCalledOnce();
	let now = 0;
	const fetch = vi.fn().mockResolvedValueOnce(response(201, { session: id }))
		.mockResolvedValueOnce(response(404)).mockResolvedValueOnce(response(201, { session: id })).mockResolvedValue(response(204));
	const reconnect = createDiagnosticsUpload({ fetch, now: () => now });
	reconnect.enqueue(entry);
	await reconnect.flush();
	now = 10000;
	await reconnect.flush();
	expect(JSON.parse(fetch.mock.calls[3][1].body)).toMatchObject({ sequence: 1, entries: [entry] });
});
