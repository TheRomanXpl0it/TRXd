<script lang="ts">
	import { toast } from 'svelte-sonner';
	import SolveListSheet from '$lib/components/challenges/SolvelistSheet.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { goto } from '$app/navigation';
	import { getChallenges, deleteChallenge } from '$lib/challenges';
	import { getCategories } from '$lib/categories';
	import { authState } from '$lib/stores/auth';
	import { onMount, untrack } from 'svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';

	import ChallengeFilters from '$lib/components/challenges/ChallengeFilters.svelte';
	import ChallengeCard from '$lib/components/challenges/ChallengeCard.svelte';
	import ChallengeModal from '$lib/components/challenges/ChallengeModal.svelte';
	import WaitingPage from '$lib/components/challenges/WaitingPage.svelte';
	import EndPage from '$lib/components/challenges/EndPage.svelte';
	import { Flag, Users, Trophy, ChevronDown, Search, Monitor } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { Challenge } from '$lib/types';

	import { config } from '$lib/env';
	import SidebarChallengeView from '$lib/components/challenges/SidebarChallengeView.svelte';

	import { uiStore } from '$lib/stores/ui.svelte';

	// Use uiStore for reactive view preference
	const challengeView = $derived(uiStore.challengeView);

	// 1. Basic Auth Deriveds
	const isAdmin = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');
	const upcoming = $derived.by(() => {
		if (!authState.ready || !authState.startTime) return false;
		return new Date(authState.startTime).getTime() > Date.now();
	});
	const ended = $derived.by(() => {
		if (!authState.ready || !authState.endTime) return false;
		return new Date(authState.endTime).getTime() < Date.now();
	});
	const isMissingTeam = $derived(
		authState.ready && authState.user && !authState.userMode && !authState.user?.team_id && !isAdmin
	);

	let openSolves = $state(false);

	let createChallengeOpen = $state(false);
	let selectedId = $state<number | null>(null);
	let countdowns: Record<string, number> = $state({});
	const queryClient = useQueryClient();

	const challengeTypes = [
		{ value: 'Normal', label: 'Normal' },
		{ value: 'Container', label: 'Container' },
		{ value: 'Compose', label: 'Compose' }
	];

	let search = $state('');
	let debouncedSearch = $state('');
	let filterCategories = $state<string[]>([]);
	let filterTags = $state<string[]>([]);
	let openModal = $state(false);

	// 3. Data Fetching
	const challengesQuery = createQuery(() => ({
		queryKey: ['challenges'],
		queryFn: getChallenges,
		enabled: authState.ready && !!authState.user
	}));

	const categoriesQuery = createQuery(() => ({
		queryKey: ['categories'],
		queryFn: getCategories,
		enabled: authState.ready && !!authState.user
	}));

	const challenges = $derived((challengesQuery.data as Challenge[]) ?? ([] as Challenge[]));
	const categories = $derived(
		((categoriesQuery.data as string[]) ?? ([] as string[])).map((c: string) => ({
			value: c,
			label: c
		}))
	);
	const loading = $derived(challengesQuery.isLoading || categoriesQuery.isLoading);
	const error = $derived(challengesQuery.error?.message);

	const sortedChallenges = $derived.by(() => {
		let list = [...challenges];

		if (debouncedSearch) {
			const s = debouncedSearch.toLowerCase();
			list = list.filter(
				(c) =>
					c.name.toLowerCase().includes(s) ||
					(c.category ?? '').toLowerCase().includes(s) ||
					(c.tags ?? []).some((t: any) => String(t).toLowerCase().includes(s))
			);
		}

		if (filterCategories.length > 0) {
			list = list.filter((c) => filterCategories.includes(c.category ?? 'Uncategorized'));
		}

		if (filterTags.length > 0) {
			list = list.filter((c) => (c.tags ?? []).some((t: any) => filterTags.includes(String(t))));
		}

		return list.sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
	});

	const allTags = $derived(
		Array.from(
			new Set<string>(
				(challenges ?? []).flatMap((ch: any) => (ch?.tags ?? []).map((t: any) => String(t)))
			)
		).sort((a, b) => a.localeCompare(b))
	);

	$effect(() => {
		const q = search;
		const t = setTimeout(() => {
			debouncedSearch = q;
		}, 300);
		return () => clearTimeout(t);
	});

	const activeFiltersCount = $derived((filterCategories?.length ?? 0) + (filterTags?.length ?? 0));

	// delete confirmation modal state
	let confirmDeleteOpen = $state(false);
	let deleting = $state(false);
	let toDelete: any = $state(null);

	// Update countdowns when challenges data changes
	$effect(() => {
		const currentChallenges = challenges;
		untrack(() => {
			let changed = false;
			const next: Record<string, number> = { ...countdowns };

			for (const c of currentChallenges) {
				if (typeof c?.timeout === 'number' && c.timeout > 0) {
					if (next[c.id] === undefined) {
						next[c.id] = c.timeout;
						changed = true;
					}
				} else if (next[c.id] !== undefined) {
					delete next[c.id];
					changed = true;
				}
			}

			if (changed) countdowns = next;
		});
	});

	// Handle errors
	$effect(() => {
		if (challengesQuery.error) {
			if (challengesQuery.error.message === 'Not started yet') {
				// This is handled in the UI
				return;
			}
			toast.error(challengesQuery.error.message || 'You need to join a team first!');
			if (challengesQuery.error.message?.toLowerCase().includes('team')) {
				goto('/team');
			}
		}
	});

	let countdownTimer: ReturnType<typeof setInterval> | undefined;

	function startCountdownTimer() {
		if (countdownTimer) return;
		countdownTimer = setInterval(() => {
			let hasActive = false;
			for (const id in countdowns) {
				if (countdowns[id] > 0) {
					countdowns[id] = countdowns[id] - 1;
					hasActive = true;
				}
			}
			if (!hasActive) {
				clearInterval(countdownTimer);
				countdownTimer = undefined;
			}
		}, 1000);
	}

	// Start timer whenever a non-zero countdown appears; stop when all expire.
	$effect(() => {
		if (Object.values(countdowns).some((v) => v > 0)) {
			startCountdownTimer();
		}
		return () => {
			clearInterval(countdownTimer);
			countdownTimer = undefined;
		};
	});

	function groupByCategory(list: Challenge[]) {
		const map: Record<string, Challenge[]> = {};
		for (const c of list) {
			const label = c.category ?? 'Uncategorized';
			(map[label] ??= []).push(c);
		}
		return Object.entries(map)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([cat, items]) => [cat, items]) as [string, Challenge[]][];
	}

	const grouped = $derived.by(() => groupByCategory(sortedChallenges));

	function openChallenge(ch: any) {
		selectedId = ch?.id ?? null;
		openModal = true;
	}

	function closeModal() {
		openModal = false;
		selectedId = null;
	}

	$effect(() => {
		if (challengeView !== 'sidebar' && selectedId && !openModal) {
			closeModal();
		}
	});

	function copyToClipboard(text: string) {
		if (typeof navigator === 'undefined') return;
		navigator.clipboard
			.writeText(text)
			.then(() => toast.success('Copied to clipboard!'))
			.catch(() => toast.error('Failed to copy to clipboard.'));
	}

	function updateCountdown(id: string | number, newCountdown: number) {
		countdowns[id] = newCountdown;
	}

	function handleChallengeSolved() {
		// Refetch challenges to get updated data
		challengesQuery.refetch();
	}

	async function confirmDelete() {
		if (!toDelete?.id) return;
		deleting = true;
		try {
			await deleteChallenge(toDelete.id);
			toast.success('Challenge deleted.');
			confirmDeleteOpen = false;
			openModal = false;
			toDelete = null;
			challengesQuery.refetch();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to delete challenge.');
		} finally {
			deleting = false;
		}
	}
</script>

{#if ((!upcoming && !ended) || isAdmin) && challengeView !== 'sidebar'}
	<div class="mb-10 w-full">
		<ChallengeFilters
			bind:search
			bind:filterCategories
			bind:filterTags
			{categories}
			{allTags}
			{activeFiltersCount}
		/>
	</div>
{/if}

{#if isMissingTeam}
	<div
		class="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center py-20 text-center duration-500"
	>
		<div class="bg-muted/50 mb-6 rounded-full p-6">
			<Users class="text-muted-foreground h-12 w-12 opacity-50" />
		</div>
		<h2 class="mb-3 text-3xl font-bold tracking-tight">Team Required</h2>
		<p class="text-muted-foreground mx-auto mb-8 max-w-md text-lg leading-relaxed">
			You must join or create a team to participate in the CTF and view challenges.
		</p>
		<div class="flex gap-4">
			<Button
				href="/team"
				class="shadow-primary/20 h-11 px-8 text-base font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
				>Go to Team Page</Button
			>
		</div>
	</div>
{:else if upcoming && !isAdmin}
	<WaitingPage startTime={authState.startTime} />
{:else if ended && !isAdmin}
	<EndPage endTime={authState.endTime} />
{:else if loading}
	<div class="flex flex-col items-center justify-center py-12">
		<div
			class="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
		></div>
		<p class="text-gray-600 dark:text-gray-400">Loading challenges...</p>
	</div>
{:else if error}
	<div
		class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950/20"
	>
		<p class="font-semibold">Error loading challenges</p>
		<p class="text-sm">{error}</p>
	</div>
{:else if challengeView === 'sidebar'}
	<div
		id="challenges-split-view"
		class="-my-6 flex h-[calc(100dvh-5rem)] min-h-0 w-full flex-col overflow-hidden py-6"
	>
		<SidebarChallengeView
			{grouped}
			onOpenChallenge={openChallenge}
			{countdowns}
			onCountdownUpdate={updateCountdown}
		/>
	</div>
{:else}
	<div class="space-y-10 pb-20">
		{#each grouped as [category, items]}
			<div>
				<h2 class="text-muted-foreground/60 mb-4 text-sm font-black uppercase tracking-tighter">
					{category}
				</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each items as ch (ch.id)}
						<ChallengeCard
							challenge={ch}
							countdown={countdowns[ch.id] ?? 0}
							onclick={() => openChallenge(ch)}
						/>
					{/each}
				</div>
			</div>
		{/each}
		{#if grouped.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<p class="text-muted-foreground">No challenges found.</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(body:has(#challenges-split-view)) {
		overflow: hidden;
	}
</style>

{#if selectedId}
	<ChallengeModal
		challenge={sortedChallenges.find((c) => c.id === selectedId)}
		bind:open={openModal}
		onSolved={handleChallengeSolved}
		onCountdownUpdate={updateCountdown}
		onOpenSolves={() => (openSolves = true)}
		countdown={countdowns[selectedId] ?? 0}
	/>
	{#if sortedChallenges.find((c) => c.id === selectedId)}
		<SolveListSheet
			bind:open={openSolves}
			challenge={sortedChallenges.find((c) => c.id === selectedId)!}
		/>
	{/if}
{/if}
