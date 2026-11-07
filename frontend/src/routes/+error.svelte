<script lang="ts">
	import { page } from '$app/stores';
	import { siteContent } from '$lib/site-content';
	import NotFound from '$lib/components/NotFound.svelte';

	const status = $derived($page.status ?? 404);
	const message = $derived(
		status === 404
			? "The page you're looking for doesn't exist, has been removed, or was moved."
			: ($page.error?.message ?? 'An unexpected error occurred.')
	);
</script>

<svelte:head>
	<title>{status === 404 ? '404 - Page Not Found' : `${status} - Error`} | {$siteContent.brand.browserTitle}</title>
</svelte:head>

<NotFound {status} {message} />
