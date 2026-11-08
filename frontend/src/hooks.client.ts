import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, message }) => {
	const err = error as any;
	const msg = String(err?.message || message || '');
	const isNetwork =
		(typeof navigator !== 'undefined' && !navigator.onLine) ||
		msg.toLowerCase().includes('fetch') ||
		msg.toLowerCase().includes('connect') ||
		msg.toLowerCase().includes('network') ||
		msg.toLowerCase().includes('load failed') ||
		msg.toLowerCase().includes('econnrefused') ||
		err?.name === 'TypeError';

	if (isNetwork) {
		return {
			message: 'Unable to connect to the server. Please check your connection and try again.',
			isConnectionError: true
		};
	}

	const cleanMessage = msg && msg !== 'Internal Error' ? msg : 'An unexpected error occurred.';
	return {
		message: cleanMessage
	};
};
