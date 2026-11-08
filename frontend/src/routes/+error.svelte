<script lang="ts">
	import { page } from '$app/stores';
	import { siteContent } from '$lib/site-content';
	import NotFound from '$lib/components/NotFound.svelte';

	const status = $derived($page.status ?? 404);
	const rawMessage = $derived($page.error?.message ?? '');
	const isConnectionError = $derived.by(() => {
		if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
		if (($page.error as any)?.isConnectionError) return true;
		const m = rawMessage.toLowerCase();
		if (
			m.includes('failed to fetch') ||
			m.includes('fetch failed') ||
			m.includes('cannot connect') ||
			m.includes('network') ||
			m.includes('load failed') ||
			m.includes('econnrefused') ||
			m.includes('connection refused')
		) {
			return true;
		}
		if (status === 502 || status === 503 || status === 504) return true;
		if (status === 500 && (rawMessage === 'Internal Error' || !rawMessage)) return true;
		return false;
	});

	const cleanMessage = $derived.by(() => {
		if (!rawMessage || rawMessage === 'Internal Error') return '';
		return rawMessage;
	});

	const message = $derived(
		status === 404
			? "The page you're looking for doesn't exist, has been removed, or was moved."
			: isConnectionError
				? 'Unable to connect to the server. Please check your connection and try again.'
				: (cleanMessage || 'An unexpected error occurred.')
	);
</script>

<svelte:head>
	<title>{status === 404 ? '404 - Page Not Found' : isConnectionError ? 'Connection Error' : `${status} - Error`} | {$siteContent.brand.browserTitle}</title>
</svelte:head>

<NotFound {status} {message} {isConnectionError} />
