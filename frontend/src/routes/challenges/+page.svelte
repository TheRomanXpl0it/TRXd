<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getChallenges, groupByCategory, updateChallengeOrder } from '$lib/challenges';
	import { authState } from '$lib/stores/auth';
	import { untrack } from 'svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { getConfigs } from '$lib/config';
	import { showSuccess, showError } from '$lib/utils/toast';

	import ChallengeFilters from '$lib/components/challenges/ChallengeFilters.svelte';
	import ChallengeCard from '$lib/components/challenges/ChallengeCard.svelte';
	import ChallengeModal from '$lib/components/challenges/ChallengeModal.svelte';
	import WaitingPage from '$lib/components/challenges/WaitingPage.svelte';
	import { Users, ChevronDown, Ellipsis } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Challenge } from '$lib/types';

	import SidebarChallengeView from '$lib/components/challenges/SidebarChallengeView.svelte';

	import { uiStore } from '$lib/stores/ui.svelte';
	import { siteContent } from '$lib/site-content';

	// Use uiStore for reactive view preference
	const challengeView = $derived(uiStore.challengeView);

	// 1. Basic Auth Deriveds
	const isAdmin = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');
	const isFullAdmin = $derived(authState.user?.role === 'Admin');
	let fixedOrderEnabled = $state(false);
	const queryClient = useQueryClient();

	async function loadFixedOrderConfig() {
		if (!isFullAdmin) return;
		try {
			const confs = await getConfigs();
			const fixedConf = Array.isArray(confs)
				? confs.find((c: any) => c.key === 'chall-fixed-order')
				: null;
			fixedOrderEnabled = fixedConf?.value === true || fixedConf?.value === 'true';
		} catch {
			fixedOrderEnabled = false;
		}
	}

	$effect(() => {
		if (isFullAdmin) {
			loadFixedOrderConfig();
		} else {
			fixedOrderEnabled = false;
		}
	});
	const upcoming = $derived.by(() => {
		if (!authState.ready || !authState.startTime) return false;
		return new Date(authState.startTime).getTime() > Date.now();
	});
	const ended = $derived.by(() => {
		if (!authState.ready || !authState.endTime) return false;
		return new Date(authState.endTime).getTime() < Date.now();
	});
	const submissionsClosed = $derived(ended && !isAdmin);
	const isMissingTeam = $derived(
		authState.ready && authState.user && !authState.userMode && !authState.user?.team_id && !isAdmin
	);

	let selectedId = $state<number | null>(null);
	let countdownEnds: Record<string, number> = $state({});
	let now = $state(Date.now());

	let search = $state('');
	let debouncedSearch = $state('');
	let filterTags = $state<string[]>([]);
	let showHidden = $state(true);
	let openModal = $state(false);

	// 3. Data Fetching
	const challengesQuery = createQuery(() => ({
		queryKey: ['challenges'],
		queryFn: getChallenges,
		enabled: authState.ready && !!authState.user,
		refetchInterval: 30000
	}));

	const challenges = $derived((challengesQuery.data as Challenge[]) ?? ([] as Challenge[]));
	const loading = $derived(challengesQuery.isLoading);
	const error = $derived(challengesQuery.error?.message);
	const searchableTags = (challenge: Challenge) =>
		isAdmin ? [...(challenge.tags ?? []), ...(challenge.author_tags ?? [])] : (challenge.tags ?? []);

	const filteredChallenges = $derived.by(() => {
		let list = [...challenges];

		if (isAdmin && !showHidden) {
			list = list.filter((c) => !c.hidden);
		}

		if (debouncedSearch) {
			const s = debouncedSearch.toLowerCase();
			list = list.filter(
				(c) =>
					c.name.toLowerCase().includes(s) ||
					(c.category ?? '').toLowerCase().includes(s) ||
					searchableTags(c).some((tag) => tag.toLowerCase().includes(s))
			);
		}

		if (filterTags.length > 0) {
			list = list.filter((c) => searchableTags(c).some((tag) => filterTags.includes(tag)));
		}

		return list;
	});

	const allTags = $derived(
		Array.from(new Set(challenges.flatMap(searchableTags))).sort((a, b) => a.localeCompare(b))
	);

	$effect(() => {
		const q = search;
		const t = setTimeout(() => {
			debouncedSearch = q;
		}, 300);
		return () => clearTimeout(t);
	});

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	const countdowns = $derived.by(() => {
		const res: Record<string, number> = {};
		for (const id in countdownEnds) {
			res[id] = Math.max(0, Math.floor((countdownEnds[id] - now) / 1000));
		}
		return res;
	});

	// Update countdown ends when challenges data changes
	$effect(() => {
		const currentChallenges = challenges;
		untrack(() => {
			let changed = false;
			const nextEnds: Record<string, number> = { ...countdownEnds };

			for (const c of currentChallenges) {
				if (typeof c?.timeout === 'number' && c.timeout > 0) {
					if (nextEnds[c.id] === undefined) {
						nextEnds[c.id] = Date.now() + c.timeout * 1000;
						changed = true;
					}
				} else if (nextEnds[c.id] !== undefined) {
					delete nextEnds[c.id];
					changed = true;
				}
			}

			if (changed) countdownEnds = nextEnds;
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

	const canDragReorder = $derived(
		isFullAdmin &&
		fixedOrderEnabled &&
		challengeView !== 'sidebar' &&
		!debouncedSearch &&
		filterTags.length === 0
	);

	const grouped = $derived.by(() => {
		const raw = groupByCategory(filteredChallenges);
		if (isFullAdmin && fixedOrderEnabled) {
			return raw.map(([cat, items]) => [
				cat,
				items.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
			] as [string, Challenge[]]);
		}
		return raw;
	});

	let draggedChall = $state<{ id: number; category: string; sort_order?: number } | null>(null);
	let dropTargetId = $state<number | null>(null);
	let isReordering = $state(false);

	function handleDragStart(e: DragEvent, ch: any, category: string) {
		if (!canDragReorder) return;
		draggedChall = { id: ch.id, category, sort_order: ch.sort_order };
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(ch.id));
			const card = (e.currentTarget as HTMLElement | null)?.closest('[data-challenge-card]');
			if (card && typeof e.dataTransfer.setDragImage === 'function') {
				e.dataTransfer.setDragImage(card, 30, 20);
			}
		}
	}

	function handleDragOver(e: DragEvent, ch: any, category: string) {
		if (!draggedChall || draggedChall.category !== category || draggedChall.id === ch.id) {
			return;
		}
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dropTargetId = ch.id;
	}

	function handleDragLeave(e: DragEvent, ch: any) {
		const related = e.relatedTarget as Node | null;
		const current = e.currentTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		if (dropTargetId === ch.id) {
			dropTargetId = null;
		}
	}

	function handleDragEnd() {
		draggedChall = null;
		dropTargetId = null;
	}

	async function handleDrop(e: DragEvent, targetChall: any, category: string, categoryItems: any[]) {
		e.preventDefault();
		if (!draggedChall || draggedChall.category !== category || draggedChall.id === targetChall.id) {
			handleDragEnd();
			return;
		}

		const sourceId = draggedChall.id;
		const sourceOrder = draggedChall.sort_order;
		const targetId = targetChall.id;
		handleDragEnd();

		const fromIndex = categoryItems.findIndex((c) => c.id === sourceId);
		const toIndex = categoryItems.findIndex((c) => c.id === targetId);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

		const newOrder = typeof targetChall.sort_order === 'number'
			? targetChall.sort_order
			: (toIndex + 1);

		if (sourceOrder !== undefined && sourceOrder === newOrder) return;

		const prevData = queryClient.getQueryData<Challenge[]>(['challenges']);
		if (prevData) {
			const updated = [...prevData];
			const fromIdx = updated.findIndex((c) => c.id === sourceId);
			const toIdx = updated.findIndex((c) => c.id === targetId);
			if (fromIdx !== -1 && toIdx !== -1) {
				const [moved] = updated.splice(fromIdx, 1);
				moved.sort_order = newOrder;
				updated.splice(toIdx, 0, moved);
				queryClient.setQueryData(['challenges'], updated);
			}
		}

		isReordering = true;
		try {
			await updateChallengeOrder(sourceId, newOrder);
			showSuccess('Challenge reordered.');
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
		} catch (err: any) {
			if (prevData) {
				queryClient.setQueryData(['challenges'], prevData);
			}
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			showError(err, 'Failed to reorder challenge.');
		} finally {
			isReordering = false;
		}
	}

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

	let handledUrlParam = $state<string | null>(null);
	$effect(() => {
		const targetParam = $page?.url?.searchParams?.get('id') || $page?.url?.searchParams?.get('challenge');
		if (targetParam && targetParam !== handledUrlParam && challenges.length > 0) {
			handledUrlParam = targetParam;
			const targetId = Number(targetParam);
			const found = challenges.find((c) => c.id === targetId);
			if (found) {
				openChallenge(found);
			}
		}
	});

	function updateCountdown(id: string | number, newCountdown: number) {
		if (newCountdown <= 0) {
			delete countdownEnds[id];
		} else {
			countdownEnds[id] = Date.now() + newCountdown * 1000;
		}
	}

	function handleChallengeSolved() {
		// Refetch challenges to get updated data
		challengesQuery.refetch();
	}
</script>

<svelte:head>
	<title>Challenges - {$siteContent.brand.browserTitle}</title>
</svelte:head>

{#if (!upcoming || isAdmin) && challengeView !== 'sidebar'}
	<div class="mb-10 w-full">
		<ChallengeFilters
			bind:search
			bind:filterTags
			bind:showHidden
			canSeeHidden={isAdmin}
			{allTags}
			activeFiltersCount={filterTags.length}
		/>
	</div>
{/if}

{#if submissionsClosed}
	<div
		class="mb-6 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-600/40 dark:bg-amber-950/25 dark:text-amber-100"
	>
		Flag submissions are closed. Challenges and instances remain available for post-CTF access.
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
			onSolved={handleChallengeSolved}
			onOpenChallenge={openChallenge}
			{countdowns}
			onCountdownUpdate={updateCountdown}
			{submissionsClosed}
			bind:showHidden
			bind:filterTags
			{allTags}
		/>
	</div>
{:else}
	<div class="space-y-10 pb-20">
		{#each grouped as [category, items]}
			{@const isCollapsed = uiStore.isCategoryCollapsed(category)}
			<div>
				<h2 class="mb-4">
					<button
						type="button"
						onclick={() => uiStore.toggleCategory(category)}
						class="text-foreground/80 hover:text-foreground dark:text-zinc-300 dark:hover:text-white flex items-center gap-1.5 text-sm font-black uppercase tracking-tighter transition-colors select-none"
						aria-expanded={!isCollapsed}
						aria-label={`Toggle ${category} category`}
					>
						<ChevronDown
							class="h-4 w-4 transition-transform duration-200 {isCollapsed ? '-rotate-90' : ''}"
						/>
						<span>{category}</span>
						<span class="text-xs font-semibold opacity-60">({items.length})</span>
					</button>
				</h2>
				{#if !isCollapsed}
					<div class="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each items as ch (ch.id)}
							<div
								role="group"
								aria-label={`Challenge card ${ch.name}`}
								class="group relative transition-all duration-200 {draggedChall?.id === ch.id
									? 'opacity-40 scale-[0.98]'
									: ''} {dropTargetId === ch.id
									? 'ring-2 ring-primary ring-offset-2 rounded-[10px]'
									: ''}"
								ondragover={(e) => handleDragOver(e, ch, category)}
								ondragleave={(e) => handleDragLeave(e, ch)}
								ondrop={(e) => handleDrop(e, ch, category, items)}
								data-challenge-card
							>
								{#if canDragReorder}
									<div
										role="button"
										tabindex="0"
										draggable="true"
										aria-label={`Drag to reorder ${ch.name}`}
										class="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center justify-center rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground/60 shadow-sm cursor-grab active:cursor-grabbing hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none"
										ondragstart={(e) => handleDragStart(e, ch, category)}
										ondragend={handleDragEnd}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => {
											if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
										}}
									>
										<Ellipsis class="h-3.5 w-3.5" />
									</div>
								{/if}
								<ChallengeCard
									challenge={ch}
									countdown={countdowns[ch.id] ?? 0}
									onclick={() => openChallenge(ch)}
								/>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		{#if grouped.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<p class="text-muted-foreground">No challenges found.</p>
			</div>
		{/if}
	</div>
{/if}

{#if selectedId}
	<ChallengeModal
		challenge={challenges.find((c) => c.id === selectedId)}
		bind:open={openModal}
		canEdit={isAdmin}
		onSolved={handleChallengeSolved}
		onCountdownUpdate={updateCountdown}
		countdown={countdowns[selectedId] ?? 0}
		{submissionsClosed}
	/>
{/if}

<style>
	:global(body:has(#challenges-split-view)) {
		overflow: hidden;
	}
</style>
