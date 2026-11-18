<script lang="ts">
	import { getTeams } from '$lib/team';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/stores';
	import { createQuery } from '@tanstack/svelte-query';
	import { authState } from '$lib/stores/auth';
	import { Users } from '@lucide/svelte';
	import { siteContent } from '$lib/site-content';
	import NotFound from '$lib/components/NotFound.svelte';
	import DirectoryTable from '$lib/components/DirectoryTable.svelte';

	const perPage = 20;

	function parsePageParam(value: string | null): number {
		if (!value) return 1;
		const pageValue = Number.parseInt(value, 10);
		return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
	}

	let currentPage = $state(parsePageParam($pageStore.url.searchParams.get('page')));

	const teamsQuery = createQuery(() => ({
		queryKey: ['teams', currentPage, perPage],
		queryFn: () => getTeams(currentPage, perPage),
		staleTime: 5 * 60 * 1000,
		placeholderData: (previousData) => previousData,
		enabled: !authState.userMode
	}));

	const rawData = $derived(teamsQuery.data);
	const isPaginated = $derived(!!rawData?.pagination);
	const teamsData = $derived(Array.isArray(rawData) ? rawData : (rawData?.data ?? []));
	const count = $derived(isPaginated ? (rawData?.pagination?.total ?? 0) : teamsData.length);
	const pageRows = $derived(
		isPaginated ? teamsData : teamsData.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const pageFromUrl = parsePageParam($pageStore.url.searchParams.get('page'));
		if (currentPage !== pageFromUrl) {
			currentPage = pageFromUrl;
		}
	});

	function handlePageChange(newPage: number) {
		currentPage = newPage;
		const nextUrl = new URL($pageStore.url);
		if (newPage > 1) {
			nextUrl.searchParams.set('page', String(newPage));
		} else {
			nextUrl.searchParams.delete('page');
		}
		const currentHref = `${$pageStore.url.pathname}${$pageStore.url.search}${$pageStore.url.hash}`;
		const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
		if (nextHref !== currentHref) {
			goto(nextHref, { replaceState: true, noScroll: true, keepFocus: true });
		}
		setTimeout(() => {
			document.getElementById('directory-table')?.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}, 0);
	}
</script>

<svelte:head>
	{#if authState.userMode}
		<title>404 Not Found</title>
	{:else}
		<title>Teams - {$siteContent.brand.browserTitle}</title>
	{/if}
</svelte:head>

{#if authState.userMode}
	<NotFound status={404} />
{:else}
	<DirectoryTable
		rows={pageRows}
		loading={teamsQuery.isLoading}
		error={teamsQuery.error?.message ?? null}
		errorTitle="Error loading teams"
		entityLabel="Team"
		hrefPrefix="/team/"
		emptyIcon={Users}
		emptyTitle="No teams found"
		emptyDescription="There are no teams to display at the moment."
		{count}
		{perPage}
		{currentPage}
		onPageChange={handlePageChange}
	/>
{/if}
