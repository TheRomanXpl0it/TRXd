<script lang="ts">
	import { getUsers } from '$lib/user';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/stores';
	import { createQuery } from '@tanstack/svelte-query';
	import { UserCircle } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth';
	import { siteContent } from '$lib/site-content';
	import DirectoryTable from '$lib/components/DirectoryTable.svelte';

	const perPage = 20;

	function parsePageParam(value: string | null): number {
		if (!value) return 1;
		const pageValue = Number.parseInt(value, 10);
		return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
	}

	let currentPage = $state(parsePageParam($pageStore.url.searchParams.get('page')));
	const isAdmin = $derived(authState.user?.role === 'Admin');

	const usersQuery = createQuery(() => ({
		queryKey: ['users', currentPage, perPage],
		queryFn: () => getUsers(currentPage, perPage),
		staleTime: 5 * 60 * 1000,
		placeholderData: (previousData) => previousData
	}));

	const rawData = $derived(usersQuery.data);
	const isPaginated = $derived(!!rawData?.pagination);
	const usersData = $derived(Array.isArray(rawData) ? rawData : (rawData?.data ?? []));
	const count = $derived(isPaginated ? (rawData?.pagination?.total ?? 0) : usersData.length);
	const pageRows = $derived(
		isPaginated ? usersData : usersData.slice((currentPage - 1) * perPage, currentPage * perPage)
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
	<title>Users - {$siteContent.brand.browserTitle}</title>
</svelte:head>

<DirectoryTable
	rows={pageRows}
	loading={usersQuery.isLoading}
	error={usersQuery.error?.message ?? null}
	errorTitle="Error loading users"
	entityLabel="User"
	hrefPrefix="/account/"
	showRole={isAdmin}
	emptyIcon={UserCircle}
	emptyTitle="No users found"
	emptyDescription="There are no registered users to display at the moment."
	{count}
	{perPage}
	{currentPage}
	onPageChange={handlePageChange}
/>
