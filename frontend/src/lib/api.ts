const BASE = '/api';

function urlOf(path: string): string {
	if (/^https?:\/\//.test(path)) return path;
	return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function parse<T>(res: Response): Promise<T> {
	if (res.status === 204) return undefined as unknown as T;

	const contentType = res.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		try {
			return (await res.json()) as T;
		} catch (e) {
			// If we expected JSON but it failed to parse, that's a hard error
			throw new Error('Expected JSON response, but parsing failed.');
		}
	}
	return (await res.text()) as unknown as T;
}

function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
	return match ? decodeURIComponent(match[2]) : null;
}

import type { BaseResponse } from './types';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers ?? {});

	let body = init.body;

	// Auto-detect JSON body
	if (body && !headers.has('content-type')) {
		const isPlainObject =
			typeof body === 'object' &&
			body !== null &&
			!(body instanceof FormData) &&
			!(body instanceof Blob) &&
			!(body instanceof URLSearchParams) &&
			!(body instanceof ArrayBuffer) &&
			!ArrayBuffer.isView(body);

		if (isPlainObject) {
			headers.set('content-type', 'application/json');
			body = JSON.stringify(body);
		}
	}

	// CSRF Protection
	const csrf = getCookie('csrf_');
	if (csrf && !headers.has('X-CSRF-Token')) {
		headers.set('X-CSRF-Token', csrf);
	}

	let res: Response;
	try {
		res = await fetch(urlOf(path), {
			credentials: 'include',
			mode: 'cors',
			...init,
			headers,
			body
		});
	} catch (err: any) {
		throw new Error(
			err?.message && !err.message.toLowerCase().includes('fetch')
				? err.message
				: 'Cannot connect to server. Please check your connection.'
		);
	}

	if (!res.ok) {
		let errorMessage = res.statusText;
		try {
			const errorBody = await parse<BaseResponse>(res);
			if (typeof errorBody === 'object' && errorBody?.error) {
				errorMessage = errorBody.error;
			} else if (typeof errorBody === 'object' && errorBody?.message) {
				errorMessage = errorBody.message;
			} else if (typeof errorBody === 'object' && errorBody?.errors && errorBody.errors.length > 0) {
				errorMessage = errorBody.errors[0];
			}
		} catch {
			// use default statusText if parsing fails
		}
		if (res.status === 502 || res.status === 503 || res.status === 504) {
			if (!errorMessage || errorMessage === res.statusText) {
				errorMessage = 'Cannot connect to server. Please check your connection.';
			}
		}
		throw new Error(errorMessage);
	}

	return parse<T>(res);
}
