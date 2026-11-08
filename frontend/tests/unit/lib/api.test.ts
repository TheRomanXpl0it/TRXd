import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '$lib/api';

describe('api transport client', () => {
	const originalFetch = globalThis.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as any;
		// Clear cookies
		document.cookie = 'csrf_=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('prefixes relative paths with /api and parses json response', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true, data: 123 }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);

		const result = await api<{ ok: boolean; data: number }>('/test-route');
		expect(mockFetch).toHaveBeenCalledWith(
			'/api/test-route',
			expect.objectContaining({
				credentials: 'include',
				mode: 'cors'
			})
		);
		expect(result).toEqual({ ok: true, data: 123 });
	});

	it('leaves absolute urls intact without prepending /api', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);

		await api('https://external.example.com/api/data');
		expect(mockFetch).toHaveBeenCalledWith(
			'https://external.example.com/api/data',
			expect.anything()
		);
	});

	it('automatically sets json content-type header and stringifies plain object body', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ saved: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);

		await api('/submit', {
			method: 'POST',
			body: { flag: 'TRX{test}' } as any
		});

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/submit',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ flag: 'TRX{test}' }),
				headers: expect.any(Headers)
			})
		);

		const sentHeaders = mockFetch.mock.calls[0][1].headers as Headers;
		expect(sentHeaders.get('content-type')).toBe('application/json');
	});

	it('attaches X-CSRF-Token header from document cookie if present', async () => {
		document.cookie = 'csrf_=secret-csrf-token-123; path=/';

		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 204 })
		);

		await api('/logout', { method: 'POST' });

		const sentHeaders = mockFetch.mock.calls[0][1].headers as Headers;
		expect(sentHeaders.get('X-CSRF-Token')).toBe('secret-csrf-token-123');
	});

	it('returns undefined for 204 No Content responses', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 204 })
		);

		const res = await api('/delete-item', { method: 'DELETE' });
		expect(res).toBeUndefined();
	});

	it('extracts error message from response json on non-ok status', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'Invalid challenge ID' }), {
				status: 400,
				statusText: 'Bad Request',
				headers: { 'content-type': 'application/json' }
			})
		);

		await expect(api('/bad-req')).rejects.toThrow('Invalid challenge ID');
	});

	it('extracts message property or errors array from error response', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ errors: ['First validation error', 'Second'] }), {
				status: 422,
				statusText: 'Unprocessable Entity',
				headers: { 'content-type': 'application/json' }
			})
		);

		await expect(api('/validation')).rejects.toThrow('First validation error');
	});

	it('handles 502/503/504 gateway errors with user-friendly connection message', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response('Bad Gateway', {
				status: 502,
				statusText: 'Bad Gateway',
				headers: { 'content-type': 'text/plain' }
			})
		);

		await expect(api('/down')).rejects.toThrow(
			'Cannot connect to server. Please check your connection.'
		);
	});

	it('handles network failure gracefully', async () => {
		mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await expect(api('/offline')).rejects.toThrow(
			'Cannot connect to server. Please check your connection.'
		);
	});
});
