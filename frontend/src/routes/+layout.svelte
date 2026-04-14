<script lang="ts">
	import '../App.css';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import Layout from '$lib/components/Layout.svelte';
	import { siteContent } from '$lib/site-content';
	import { authState, loadUser } from '$lib/stores/auth';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { addCollection } from '@iconify/svelte';
	import circleFlagsData from '@iconify-json/circle-flags/icons.json';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { page } from '$app/state';

	addCollection(circleFlagsData);

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				gcTime: 5 * 60 * 1000,
				retry: 1,
				refetchOnWindowFocus: false
			}
		}
	});

	loadUser(false);
	void siteContent.load();
</script>

<svelte:head>
	<title>{$siteContent.brand.browserTitle}</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
	<Tooltip.Provider delayDuration={400}>
		<Toaster position="bottom-right" class="!justify-center md:!justify-end" />
		<ModeWatcher />

		{#if !authState.ready}
			<!-- Loading state -->
			<div class="flex h-screen w-full items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100"
				></div>
			</div>
		{:else}
			<Layout user={authState.user} userMode={authState.userMode ?? false} isLandingPage={page.url.pathname === '/'}>
				{@render children()}
			</Layout>
		{/if}
	</Tooltip.Provider>
</QueryClientProvider>
