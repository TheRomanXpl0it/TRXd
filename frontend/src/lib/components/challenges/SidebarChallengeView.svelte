<script lang="ts">
	import AuthorTags from './AuthorTags.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Flag,
		CheckCircle,
		Droplet,
		ChevronDown,
		Search,
		UserCog,
		Download,
		Info,
		Trophy,
		Users,
		Clock,
		Eye,
		EyeOff,
		LockKeyhole
	} from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import type { Challenge } from '$lib/types';
	import Markdown from '$lib/components/Markdown.svelte';
	import FlagSubmission from './FlagSubmission.svelte';
	import InstanceControls from './InstanceControls.svelte';
	import ChallengeSolvesTable from './ChallengeSolvesTable.svelte';
	import { slide } from 'svelte/transition';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { getSolves } from '$lib/challenges';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { fmtTimeLeft } from '$lib/utils/time';
	import { formatConnectionString } from '$lib/utils/connection';
	import { authState } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import TagFilterPopover from './TagFilterPopover.svelte';
	import ViewToggle from './ViewToggle.svelte';

	let {
		grouped,
		onSolved,
		onOpenChallenge,
		countdowns = {} as Record<string | number, number>,
		onCountdownUpdate,
		submissionsClosed = false,
		showHidden = $bindable(true),
		filterTags = $bindable([] as string[]),
		allTags = [] as string[]
	}: {
		grouped: [string, Challenge[]][];
		onSolved?: () => void;
		onOpenChallenge?: (ch: Challenge) => void;
		countdowns?: Record<string | number, number>;
		onCountdownUpdate?: (id: string | number, newCountdown: number) => void;
		submissionsClosed?: boolean;
		showHidden?: boolean;
		filterTags?: string[];
		allTags?: string[];
	} = $props();

	import { uiStore } from '$lib/stores/ui.svelte';

	const isPrivileged = $derived(
		authState.user?.role === 'Admin' || authState.user?.role === 'Author'
	);

	// Use uiStore for reactive view preference
	const challengeView = $derived(uiStore.challengeView);
	let activeChallenge = $state<Challenge | null>(null);
	let activeTab = $state<'details' | 'solves'>('details');
	let search = $state('');
	let solves = $state<any[]>([]);
	let loadingSolves = $state(false);
	let mobileShowSide = $state(true);

	const filteredGrouped = $derived.by(() => {
		let currentGrouped = grouped;
		if (isPrivileged && !showHidden) {
			currentGrouped = currentGrouped
				.map(([cat, items]) => [cat, items.filter((ch) => !ch.hidden)])
				.filter(([_, items]) => items.length > 0) as [string, Challenge[]][];
		}
		if (filterTags.length > 0) {
			currentGrouped = currentGrouped
				.map(([cat, items]) => [
					cat,
					items.filter((ch) => {
						const tags = isPrivileged
							? [...(ch.tags ?? []), ...(ch.author_tags ?? [])]
							: (ch.tags ?? []);
						return filterTags.some((t) => tags.includes(t));
					})
				])
				.filter(([_, items]) => items.length > 0) as [string, Challenge[]][];
		}
		if (!search.trim()) return currentGrouped;
		const q = search.toLowerCase();
		return currentGrouped
			.map(([cat, items]) => [
				cat,
				items.filter(
					(ch) =>
						ch.name.toLowerCase().includes(q) ||
						(ch.tags || []).some((t) => t.toLowerCase().includes(q)) ||
						(isPrivileged && (ch.author_tags ?? []).some((tag) => tag.toLowerCase().includes(q)))
				)
			])
			.filter(([_, items]) => items.length > 0) as [string, Challenge[]][];
	});

	async function selectChallenge(ch: Challenge) {
		activeChallenge = { ...ch };
		activeTab = 'details';
		solves = [];
		mobileShowSide = false;
	}

	async function loadSolves() {
		if (!activeChallenge) return;
		loadingSolves = true;
		try {
			solves = await getSolves(activeChallenge.id);
		} catch (err) {
			console.error('Failed to load solves:', err);
		} finally {
			loadingSolves = false;
		}
	}

	$effect(() => {
		if (activeChallenge) {
			solves = [];
			if (activeTab === 'solves') {
				loadSolves();
			}
		}
	});

	$effect(() => {
		if (!activeChallenge && filteredGrouped.length > 0 && filteredGrouped[0][1].length > 0) {
			activeChallenge = { ...filteredGrouped[0][1][0] };
		} else if (activeChallenge?.hidden && isPrivileged && !showHidden) {
			if (filteredGrouped.length > 0 && filteredGrouped[0][1].length > 0) {
				activeChallenge = { ...filteredGrouped[0][1][0] };
			} else {
				activeChallenge = null;
			}
		}
	});

	let handledUrlParam = $state<string | null>(null);
	$effect(() => {
		const targetParam = $page?.url?.searchParams?.get('id') || $page?.url?.searchParams?.get('challenge');
		if (targetParam && targetParam !== handledUrlParam && filteredGrouped.length > 0) {
			handledUrlParam = targetParam;
			const targetId = Number(targetParam);
			for (const [_, items] of filteredGrouped) {
				const found = items.find((c) => c.id === targetId);
				if (found) {
					selectChallenge(found);
					break;
				}
			}
		}
	});

	const connectionString = $derived.by(() => {
		if (!activeChallenge) return '';
		const ch = activeChallenge;

		const h = ch.host || '';
		const p = ch.port;

		const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(
			h.toLowerCase().trim()
		);

		// Any challenge with 'instance: true' is treated as an instance challenge
		// and will never show static placeholder connection info if the host is local.
		if ((isDynamicType || ch.instance) && !ch.instance_host && isLocal) {
			return '';
		}

		// Prefer pre-computed connection info from backend if not dynamic/ghost
		if (ch.connection_info && (!ch.instance || !ch.connection_info.includes('localhost'))) {
			return ch.connection_info;
		}

		return formatConnectionString({
			host: h,
			port: p,
			connType: ch.conn_type,
			sslWithoutPort: isDynamicType || ch.instance || !!ch.instance_host
		});
	});

	const isDynamicType = $derived(
		activeChallenge?.instance_type === 'Container' ||
			activeChallenge?.instance_type === 'Compose' ||
			!!activeChallenge?.image ||
			!!activeChallenge?.compose
	);
</script>

<div
	class="relative flex h-full min-h-0 max-h-full w-full gap-0 overflow-hidden rounded-[1.5rem] border border-border/30 bg-background/24 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-background/18"
>
	<!-- Left Sidebar: Challenge List -->
	<aside
		class={cn(
			'w-full shrink-0 flex-col border-r border-border/18 bg-background/18 backdrop-blur-xl transition-all duration-300 dark:border-white/6 dark:bg-background/14 lg:w-80',
			mobileShowSide ? 'flex' : 'hidden lg:flex'
		)}
	>
		<div class="border-border/15 bg-background/12 border-b px-4 py-3">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.2em]">
					Challenges
				</h2>
				<div class="flex items-center gap-1">
					{#if isPrivileged}
						<!-- 1. Hidden challenges toggle (authors/admins only, eye icon only) -->
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Button
									variant={showHidden ? 'ghost' : 'secondary'}
									size="icon"
									class="h-8 w-8 shrink-0 cursor-pointer"
									onclick={() => (showHidden = !showHidden)}
									aria-label={showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}
									title={showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}
									data-testid="sidebar-toggle-hidden-challenges"
								>
									{#if showHidden}
										<Eye class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
									{:else}
										<EyeOff class="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden="true" />
									{/if}
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>{showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}</Tooltip.Content>
						</Tooltip.Root>

						<!-- 2. Author tags toggle (authors/admins only) -->
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Button
									variant={uiStore.showAuthorTags ? 'ghost' : 'secondary'}
									size="icon"
									class="h-8 w-8 shrink-0 cursor-pointer"
									onclick={() => uiStore.toggleAuthorTags()}
									aria-label={uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}
									title={uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}
									data-testid="sidebar-toggle-author-tags"
								>
									<LockKeyhole
										class="h-3.5 w-3.5 shrink-0 {uiStore.showAuthorTags ? '' : 'opacity-40'}"
										aria-hidden="true"
									/>
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>{uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}</Tooltip.Content>
						</Tooltip.Root>
					{/if}

					<!-- 3. Tag filter (icon-only, hover "Filter by tags") -->
					<TagFilterPopover bind:filterTags {allTags} size="sm" />

					<!-- 4. Grid/Sidebar toggle -->
					<ViewToggle size="sm" />
				</div>
			</div>
			<div class="group relative mt-2">
				<Search
					class="text-muted-foreground/30 group-focus-within:text-primary/50 absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors"
				/>
				<Input
					placeholder="Search tasks..."
					bind:value={search}
					class="bg-muted/30 focus-visible:ring-primary/20 h-8 rounded-lg border-none pl-9 text-xs shadow-inner"
				/>
			</div>
		</div>

		<div class="custom-scrollbar flex-1 overflow-y-auto scroll-smooth">
			<div class="space-y-1 p-2">
				{#each filteredGrouped as [category, items]}
					{@const isCollapsed = uiStore.isCategoryCollapsed(category)}
					<div class="space-y-1">
						<button
							onclick={() => uiStore.toggleCategory(category)}
							class="bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 text-muted-foreground hover:text-foreground group flex w-full items-center justify-between rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
						>
							<div class="flex items-center gap-2">
								<ChevronDown
									class="h-3 w-3 transition-transform {isCollapsed ? '-rotate-90' : ''}"
								/>
								<span>{category}</span>
							</div>
							<span class="bg-muted rounded px-1.5 py-0.5 text-[9px] opacity-60"
								>{items.length}</span
							>
						</button>

						{#if !isCollapsed}
							<div class="space-y-1">
								{#each items as ch (ch.id)}
									<button
										onclick={() => selectChallenge(ch)}
											class={cn(
											'group flex w-full flex-col gap-1.5 rounded-xl px-4 py-3 text-left transition-colors duration-0',
											activeChallenge?.id === ch.id
												? 'bg-primary/10 text-foreground shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
												: ch.solved
													? 'solve-surface solve-surface-hover solve-text'
													: 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
										)}
									>
										<div class="flex items-start justify-between gap-3">
											<div class="flex items-center gap-2">
												<span
													class={cn(
														'text-zinc-900 dark:text-zinc-100 block truncate py-0.5 leading-normal text-sm font-bold',
														ch.hidden && isPrivileged ? 'opacity-50' : ''
													)}
												>
													{ch.name}
												</span>
												{#if ch.hidden && isPrivileged}
													<EyeOff class="h-3 w-3 text-zinc-400" />
												{/if}
											</div>
											{#if ch.solved}
												<CheckCircle class="solve-text-strong h-4 w-4 shrink-0" />
											{/if}
											{#if countdowns[ch.id] > 0}
												<div
													class="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-emerald-500 dark:bg-emerald-500/20"
												>
													<Clock class="h-2.5 w-2.5" />
													{fmtTimeLeft(countdowns[ch.id])}
												</div>
											{/if}
										</div>

										<div
											class="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
										>
											<span class="text-zinc-900 dark:text-zinc-100 opacity-70">{ch.points} pts</span>
											<div class="flex items-center gap-1 font-mono opacity-50">
												<Users class="h-3 w-3" />
												{ch.solves || 0}
											</div>
										</div>

										{#if ch.tags && ch.tags.length > 0}
											<div class="mt-0.5 flex flex-wrap gap-1.5">
												{#each ch.tags.slice(0, 3) as tag}
													<span
														class="bg-muted/75 text-muted-foreground inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium"
													>
														#{tag}
													</span>
												{/each}
											</div>
										{/if}
										<AuthorTags tags={ch.author_tags} />
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}

				{#if filteredGrouped.length === 0}
					<div class="flex flex-col items-center gap-3 py-20 text-center">
						<Search class="text-muted-foreground h-6 w-6 opacity-20" />
						<p class="text-muted-foreground/60 text-xs font-medium italic">No challenges found.</p>
					</div>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Right Content: Challenge Details -->
	<main
		class={cn(
			'h-full min-w-0 flex-1 flex-col overflow-hidden bg-background/8 backdrop-blur-lg transition-all duration-300 dark:bg-background/6',
			mobileShowSide ? 'hidden lg:flex' : 'flex'
		)}
	>
		{#if activeChallenge}
			<!-- Scrollable zone: header + tabs + content (excluding flag submission) -->
			<div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
				<header class="border-border/12 bg-background/6 border-b px-6 py-4 sm:px-8 sm:py-5">
					<div
						class="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="min-w-0 space-y-2">
							<Button
								variant="ghost"
								size="sm"
								class="text-primary hover:bg-primary/5 -ml-3 h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-widest lg:hidden"
								onclick={() => (mobileShowSide = true)}
							>
								<ChevronDown class="h-4 w-4 rotate-90" />
								Back to list
							</Button>
							<h1
								class="text-foreground break-words pb-0.5 text-3xl font-black leading-tight tracking-tighter sm:text-5xl"
							>
								{activeChallenge.name}
							</h1>
							{#if activeChallenge.authors && activeChallenge.authors.length > 0}
								<div
									class="text-muted-foreground/60 flex items-center gap-2 text-[10px] text-sm font-bold uppercase tracking-widest"
								>
									<UserCog class="h-3.5 w-3.5" />
									<span>{activeChallenge.authors.join(' & ')}</span>
								</div>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-6 p-0 opacity-90">
							<div class="text-right">
								<p
									class="text-muted-foreground/80 mb-1 text-[10px] font-black uppercase tracking-[0.2em]"
								>
									Points
								</p>
								<p
									class="text-foreground text-3xl font-black tabular-nums leading-tight tracking-tighter"
								>
									{activeChallenge.points}
								</p>
							</div>
							<div class="bg-border/40 h-10 w-px"></div>
							<div class="text-right">
								<p
									class="text-muted-foreground/80 mb-1 text-[10px] font-black uppercase tracking-[0.2em]"
								>
									Solves
								</p>
								<p
									class="text-foreground text-3xl font-black tabular-nums leading-tight tracking-tighter"
								>
									{activeChallenge.solves || 0}
								</p>
							</div>
						</div>
					</div>
				</header>

				<!-- Standard Tabs -->
				<div class="bg-background/4 px-6 sm:px-8">
					<div class="border-border/12 flex justify-center border-b pb-3 pt-3">
						<div
							class="bg-muted/40 text-muted-foreground inline-flex h-9 items-center justify-center gap-1 rounded-lg p-1 backdrop-blur-sm"
						>
							<button
								class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
								'details'
									? 'bg-background/45 text-foreground shadow-sm backdrop-blur-sm'
									: 'hover:bg-background/50 hover:text-foreground'}"
								onclick={() => (activeTab = 'details')}
							>
								<Info class="h-4 w-4" />
								Details
							</button>
							<button
								class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
								'solves'
									? 'bg-background/45 text-foreground shadow-sm backdrop-blur-sm'
									: 'hover:bg-background/50 hover:text-foreground'}"
								onclick={() => (activeTab = 'solves')}
							>
								<Trophy class="h-4 w-4" />
								Solves
							</button>
						</div>
					</div>

					<div class="mx-auto max-w-4xl space-y-4 p-4 sm:space-y-6 sm:p-6">
						{#if activeTab === 'details'}
							<div class="animate-in fade-in m-0 space-y-4 sm:space-y-5 duration-300">
								<!-- Description -->
								<section>
									<h3
										class="text-muted-foreground/60 mb-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
									>
										Description
										<div class="bg-border h-px flex-1"></div>
									</h3>
									<div class="prose prose-neutral dark:prose-invert max-w-none">
										<Markdown
											content={activeChallenge.description}
											class="text-base sm:text-lg font-medium leading-relaxed tracking-tight break-words"
										/>
									</div>
								</section>

								<!-- Files -->
								{#if activeChallenge.attachments && activeChallenge.attachments.length > 0}
									<section>
										<h3
											class="text-muted-foreground/60 mb-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
										>
											Resources
											<div class="bg-border h-px flex-1"></div>
										</h3>
										<div class="flex flex-wrap gap-2.5">
											{#each activeChallenge.attachments as file}
												<a
													href={`/attachments/${activeChallenge.id}/${file.replace(/^\/+/, '')}`}
													target="_blank"
													rel="noopener noreferrer"
													class="bg-muted/20 hover:bg-primary/5 hover:border-primary/20 group inline-flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-sm font-bold transition-all"
												>
													<Download class="h-4 w-4 opacity-40 group-hover:opacity-100" />
													<span>{file.split('/').pop()}</span>
												</a>
											{/each}
										</div>
									</section>
								{/if}

								<!-- Instance Controls -->
								{#if activeChallenge.instance || isDynamicType}
									<section>
										<h3
											class="text-muted-foreground/60 mb-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
										>
											<span class="shrink-0">Instance Management</span>
											<div class="bg-border h-px flex-1"></div>
										</h3>
										<div class="p-0">
											{#key activeChallenge.id}
												<InstanceControls
													challenge={activeChallenge}
													hideHeader={true}
													showTimer={true}
													countdown={countdowns[activeChallenge.id] ?? 0}
													{onCountdownUpdate}
													onInstanceChange={(updated) => {
														if (updated) activeChallenge = updated;
													}}
												/>
											{/key}
										</div>
									</section>
								{:else if !isDynamicType && activeChallenge.host && activeChallenge.host !== 'localhost' && activeChallenge.host !== '127.0.0.1' && connectionString}
									<section>
										<h3
											class="text-muted-foreground/60 mb-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
										>
											Connection Info
											<div class="bg-border h-px flex-1"></div>
										</h3>
										<div
											class="bg-muted/20 flex items-center justify-between gap-4 rounded-xl border border-dashed border-border p-3.5 sm:p-4 font-mono text-sm"
										>
											<code
												class="bg-background/38 overflow-x-auto whitespace-nowrap rounded border border-border px-3 py-1 text-base font-bold backdrop-blur-sm"
												>{connectionString}</code
											>
											{#if connectionString.startsWith('http')}
												<Button
													href={connectionString}
													target="_blank"
													variant="outline"
													size="sm"
													class="h-8 text-[10px] font-bold uppercase tracking-widest"
												>
													Visit
												</Button>
											{/if}
										</div>
									</section>
								{/if}
							</div>
						{:else if activeTab === 'solves'}
							<div class="animate-in fade-in m-0 duration-300">
								<div class="bg-background/20 overflow-hidden rounded-xl border border-border/18 shadow-sm backdrop-blur-sm">
									{#if loadingSolves}
										<div class="flex flex-col items-center gap-6 p-20 text-center">
											<Spinner class="h-8 w-8" />
											<p
												class="text-muted-foreground/50 text-xs font-bold uppercase tracking-widest"
											>
												Loading solves...
											</p>
										</div>
									{:else}
										<div class="px-6 py-4">
											<ChallengeSolvesTable {solves} />
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Sticky flag submission footer (details tab only) -->
			{#if activeTab === 'details'}
				<div class="bg-background/8 shrink-0 border-t border-border/10 px-8 pb-8 pt-4 shadow-none">
					<div class="mx-auto max-w-4xl">
						{#key activeChallenge.id}
							<FlagSubmission
								challenge={activeChallenge}
								{submissionsClosed}
								onSolved={() => {
									if (activeChallenge) activeChallenge.solved = true;
									if (onSolved) onSolved();
								}}
							/>
						{/key}
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex flex-1 flex-col items-center justify-center p-20 text-center">
				<div class="bg-muted/20 border-border mb-8 rounded-full border-2 border-dashed p-12">
					<Flag class="text-muted-foreground/30 h-12 w-12" />
				</div>
				<p class="mb-2 text-xl font-bold tracking-tight">Select a Challenge</p>
				<p class="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
					Please choose an available challenge from the list on the left to view details and submit
					flags.
				</p>
			</div>
		{/if}
	</main>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.1);
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.2);
	}
</style>
