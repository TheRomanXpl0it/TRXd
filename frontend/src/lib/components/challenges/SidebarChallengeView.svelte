<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
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
		Monitor,
		Clock,
		EyeOff
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
	import { getSolves } from '$lib/challenges';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { fmtTimeLeft } from '$lib/utils/time';
	import { formatConnectionString } from '$lib/utils/connection';
	import { authState } from '$lib/stores/auth';

	let {
		grouped,
		onSolved,
		onOpenChallenge,
		countdowns = {} as Record<string | number, number>,
		onCountdownUpdate
	}: {
		grouped: [string, Challenge[]][];
		onSolved?: () => void;
		onOpenChallenge?: (ch: Challenge) => void;
		countdowns?: Record<string | number, number>;
		onCountdownUpdate?: (id: string | number, newCountdown: number) => void;
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
	let collapsedCats = $state<Set<string>>(new Set());
	let solves = $state<any[]>([]);
	let loadingSolves = $state(false);
	let mobileShowSide = $state(true);

	const filteredGrouped = $derived.by(() => {
		if (!search.trim()) return grouped;
		const q = search.toLowerCase();
		return grouped
			.map(([cat, items]) => [
				cat,
				items.filter(
					(ch) =>
						ch.name.toLowerCase().includes(q) ||
						(ch.tags || []).some((t) => t.toLowerCase().includes(q))
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
		if (activeChallenge && activeTab === 'solves') {
			loadSolves();
		}
	});

	$effect(() => {
		if (activeChallenge) {
			solves = [];
			if (activeTab === 'solves') {
				loadSolves();
			}
		}
	});

	function toggleCategory(cat: string) {
		const next = new Set(collapsedCats);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		collapsedCats = next;
	}

	$effect(() => {
		if (!activeChallenge && filteredGrouped.length > 0 && filteredGrouped[0][1].length > 0) {
			activeChallenge = { ...filteredGrouped[0][1][0] };
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
		activeChallenge?.type === 'Container' ||
			activeChallenge?.type === 'Compose' ||
			!!activeChallenge?.image ||
			!!activeChallenge?.compose
	);
</script>

<div
	class="bg-card relative flex h-[800px] max-h-[calc(100vh-160px)] w-full gap-0 overflow-hidden rounded-xl border-0 shadow-sm"
>
	<!-- Left Sidebar: Challenge List -->
	<aside
		class={cn(
			'bg-card w-full shrink-0 flex-col border-r transition-all duration-300 lg:w-80',
			mobileShowSide ? 'flex' : 'hidden lg:flex'
		)}
	>
		<div class="bg-card space-y-4 px-5 py-6">
			<h2 class="text-muted-foreground/40 px-1 text-[10px] font-black uppercase tracking-[0.2em]">
				Challenges
			</h2>
			<div class="group relative">
				<Search
					class="text-muted-foreground/30 group-focus-within:text-primary/50 absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors"
				/>
				<Input
					placeholder="Search tasks..."
					bind:value={search}
					class="bg-muted/30 focus-visible:ring-primary/20 h-9 rounded-lg border-none pl-9 text-xs shadow-inner"
				/>
			</div>
		</div>

		<div class="custom-scrollbar flex-1 overflow-y-auto scroll-smooth">
			<div class="space-y-2 p-3">
				{#each filteredGrouped as [category, items]}
					{@const isCollapsed = collapsedCats.has(category)}
					<div class="space-y-1">
						<button
							onclick={() => toggleCategory(category)}
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
												? 'bg-emerald-500/10 dark:bg-[#05100a] text-emerald-600 dark:text-emerald-500/80 hover:bg-emerald-500/20 dark:hover:bg-[#081a11]'
														: 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
											)}
										>
										<div class="flex items-start justify-between gap-3">
											<div class="flex items-center gap-2">
												<span
													class={cn(
														'text-zinc-900 dark:text-zinc-100 truncate text-sm font-bold tracking-tight',
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
												<CheckCircle class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
														class="bg-muted/60 text-muted-foreground/80 rounded-md px-2 py-0.5 text-[11px] font-bold lowercase tracking-tight"
													>
														#{tag}
													</span>
												{/each}
											</div>
										{/if}
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
			'bg-background h-full min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300',
			mobileShowSide ? 'hidden lg:flex' : 'flex'
		)}
	>
		{#if activeChallenge}
			<!-- Scrollable zone: header + tabs + content (excluding flag submission) -->
			<div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
				<header class="bg-background px-8 py-10">
					<div
						class="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="min-w-0 space-y-4">
							<div class="flex flex-wrap items-center gap-3">
								<Button
									variant="ghost"
									size="sm"
									class="text-primary hover:bg-primary/5 -ml-3 h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-widest lg:hidden"
									onclick={() => (mobileShowSide = true)}
								>
									<ChevronDown class="h-4 w-4 rotate-90" />
									Back to List
								</Button>
								<Badge
									variant="secondary"
									class="bg-primary/10 text-primary border-none px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
								>
									{activeChallenge.category}
								</Badge>
								{#if activeChallenge.solved}
									<Badge
										class="border-none bg-emerald-500/10 dark:bg-[#05100a] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500/80"
									>
										Solved
									</Badge>
								{/if}
								{#if activeChallenge.hidden && isPrivileged}
									<Badge
										variant="outline"
										class="border-zinc-400/20 bg-zinc-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
									>
										<EyeOff class="mr-1.5 h-3 w-3" />
										Hidden
									</Badge>
								{/if}
								{#if activeChallenge.tags && activeChallenge.tags.length > 0}
									<div class="flex gap-2">
										{#each activeChallenge.tags as tag}
											<Badge
												variant="outline"
												class="bg-muted/30 text-muted-foreground border-none px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest"
											>
												#{tag}
											</Badge>
										{/each}
									</div>
								{/if}
							</div>
							<h1
								class="text-foreground truncate text-3xl font-black leading-[1.1] tracking-tighter sm:text-5xl"
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
									class="text-foreground text-3xl font-black tabular-nums leading-none tracking-tighter"
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
									class="text-foreground text-3xl font-black tabular-nums leading-none tracking-tighter"
								>
									{activeChallenge.solves || 0}
								</p>
							</div>
						</div>
					</div>
				</header>

				<!-- Standard Tabs -->
				<div class="bg-background px-8">
					<div class="flex justify-center border-b pb-4 pt-4">
						<div
							class="bg-muted text-muted-foreground inline-flex h-10 items-center justify-center gap-1 rounded-lg p-1"
						>
							<button
								class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
								'details'
									? 'bg-background text-foreground shadow-sm'
									: 'hover:bg-background/50 hover:text-foreground'}"
								onclick={() => (activeTab = 'details')}
							>
								<Info class="h-4 w-4" />
								Details
							</button>
							<button
								class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
								'solves'
									? 'bg-background text-foreground shadow-sm'
									: 'hover:bg-background/50 hover:text-foreground'}"
								onclick={() => (activeTab = 'solves')}
							>
								<Trophy class="h-4 w-4" />
								Solves
							</button>
						</div>
					</div>

					<div class="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-12 sm:p-10">
						{#if activeTab === 'details'}
							<div class="animate-in fade-in m-0 space-y-10 duration-300">
								<!-- Description -->
								<section>
									<h3
										class="text-muted-foreground/60 mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
									>
										Description
										<div class="bg-border h-px flex-1"></div>
									</h3>
									<div class="prose prose-neutral dark:prose-invert max-w-none">
										<Markdown
											content={activeChallenge.description}
											class="text-lg font-medium leading-relaxed tracking-tight"
										/>
									</div>
								</section>

								<!-- Files -->
								{#if activeChallenge.attachments && activeChallenge.attachments.length > 0}
									<section>
										<h3
											class="text-muted-foreground/60 mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
										>
											Resources
											<div class="bg-border h-px flex-1"></div>
										</h3>
										<div class="flex flex-wrap gap-3">
											{#each activeChallenge.attachments as file}
												<a
													href={`/attachments/${activeChallenge.id}/${file.replace(/^\/+/, '')}`}
													target="_blank"
													rel="noopener noreferrer"
													class="bg-muted/20 hover:bg-primary/5 hover:border-primary/20 group inline-flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-bold transition-all"
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
											class="text-muted-foreground/60 mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
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
											class="text-muted-foreground/60 mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"
										>
											Connection Info
											<div class="bg-border h-px flex-1"></div>
										</h3>
										<div
											class="bg-muted/20 flex items-center justify-between gap-4 rounded-xl border border-dashed p-5 font-mono text-sm"
										>
											<code
												class="bg-background overflow-x-auto whitespace-nowrap rounded border px-3 py-1 text-base font-bold"
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
								<div class="bg-card overflow-hidden rounded-xl border-0 shadow-sm">
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
				<div class="bg-background shrink-0 border-t-0 border-none px-8 pb-8 pt-2 shadow-none">
					<div class="mx-auto max-w-4xl">
						{#key activeChallenge.id}
							<FlagSubmission
								challenge={activeChallenge}
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
				<div class="bg-muted/20 mb-8 rounded-full border-2 border-dashed p-12">
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
