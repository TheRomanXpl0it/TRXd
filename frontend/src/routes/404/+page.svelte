<script lang="ts">
	import { siteContent } from '$lib/site-content';
	import NotFound from '$lib/components/NotFound.svelte';
</script>

<svelte:head>
	<title>404 - Page Not Found | {$siteContent.brand.browserTitle}</title>
</svelte:head>

<NotFound status={404} />
