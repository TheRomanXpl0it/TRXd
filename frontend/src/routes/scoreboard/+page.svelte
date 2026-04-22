<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import ScoreHistory from '$lib/components/scoreboard/Graph.svelte';
	import { Trophy, LayoutDashboard, Layout } from '@lucide/svelte';
	import { getScoreboard, getGraphData } from '@/scoreboard';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/auth';
	import ErrorMessage from '$lib/components/ui/error-message.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import CountryFlag from '$lib/components/ui/country-flag.svelte';
	import { Globe } from '@lucide/svelte';
	import countries from '$lib/data/countries.json';
	import PixelBackground from '$lib/components/ui/PixelBackground.svelte';
	
	// Pre-process countries into a map for O(1) lookups
	const countryMap = new Map((countries as any[]).map(c => [c.iso3?.toUpperCase(), c.iso2?.toUpperCase()]));

	let perPage = $state(20);
	let currentPage = $state(1);
	let isCompact = $state(false);

	const scoreboardQuery = createQuery(() => ({
		queryKey: ['scoreboard', currentPage, perPage],
		queryFn: () => getScoreboard(currentPage, perPage),
		staleTime: 30_000,
		placeholderData: (previousData: any) => previousData
	}));

	const graphQuery = createQuery(() => ({
		queryKey: ['scoreboard-graph'],
		queryFn: getGraphData,
		staleTime: 30_000
	}));

	// Derived values
	const rawData = $derived(scoreboardQuery.data);
	const isPaginated = $derived(!!rawData?.pagination);
	const scoreboardData = $derived(Array.isArray(rawData) ? rawData : (rawData?.data ?? []));
	const graphData = $derived(graphQuery.data ?? []);
	const loading = $derived(scoreboardQuery.isLoading || graphQuery.isLoading);
	const error = $derived(scoreboardQuery.error?.message ?? graphQuery.error?.message ?? null);

	// Sort logic handled by backend but safety here
	const sorted = $derived(Array.isArray(scoreboardData) ? [...scoreboardData] : []);
	const count = $derived(isPaginated ? (rawData?.pagination?.total ?? 0) : sorted.length);

	$effect(() => {
		if (currentPage > 1) {
			setTimeout(() => {
				const paginationEl = document.getElementById('pagination-controls');
				if (paginationEl) {
					paginationEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				}
			}, 0);
		}
	});

	function truncateName(name: string, maxLength = 32): string {
		if (!name || name.length <= maxLength) return name;
		return name.slice(0, maxLength) + '...';
	}

	function handlePageChange(newPage: number) {
		currentPage = newPage;
	}

	function getCountryIso2(iso3: string): string | null {
		if (!iso3) return null;
		return countryMap.get(iso3.toUpperCase()) ?? null;
	}
</script>

<PixelBackground theme="mixed" opacity={0.15} overlayOpacity={0.6} />

<div class="relative z-10 mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
	<!-- Compact Mode Toggle -->
	<div class="absolute right-4 top-4 z-10 sm:right-8 sm:top-8">
		<Button
			variant="ghost"
			size="icon"
			class="text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors"
			onclick={() => (isCompact = !isCompact)}
			title={isCompact ? 'Full View' : 'Compact View (Hide Legend)'}
		>
			{#if isCompact}
				<LayoutDashboard class="h-4 w-4" />
			{:else}
				<Layout class="h-4 w-4" />
			{/if}
		</Button>
	</div>

	<!-- Header Region -->
	<div class="mb-8 mt-2 text-center">
		<h1 class="text-foreground text-5xl font-black tracking-tighter sm:text-6xl">Scoreboard</h1>
	</div>

	{#if error}
		<ErrorMessage title="Error loading scoreboard" message={error} />
	{:else}
		<!-- Graph Container -->
		<div class="mb-12">
			<ScoreHistory data={graphData} userMode={authState.userMode} compact={isCompact} />
		</div>
		<Card.Root class="mt-8 overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 w-[80px] bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>Rank</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 min-w-[200px] bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>{authState.userMode ? 'Player' : 'Team'}</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>Badges</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-right text-[10px] font-bold uppercase tracking-wider"
									>Score</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if loading && scoreboardData.length === 0}
								{#each Array(10) as _}
									<Table.Row>
										<Table.Cell><Skeleton class="h-6 w-8" /></Table.Cell>
										<Table.Cell><Skeleton class="h-4 w-[150px]" /></Table.Cell>
										<Table.Cell><Skeleton class="h-4 w-[100px]" /></Table.Cell>
										<Table.Cell class="text-right"
											><Skeleton class="ml-auto h-4 w-[60px]" /></Table.Cell
										>
									</Table.Row>
								{/each}
							{:else}
								{@const pageRows = (
									isPaginated
										? sorted
										: sorted.slice((currentPage - 1) * perPage, currentPage * perPage)
								).filter((row) => (row.score ?? 0) >= 0)}

								{#if pageRows.length === 0}
									<Table.Row>
										<Table.Cell colspan={4} class="h-[300px] text-center">
											<EmptyState
												icon={Trophy}
												title="No data yet"
												description="The scoreboard is currently empty."
											/>
										</Table.Cell>
									</Table.Row>
								{:else}
									{#each pageRows as row, i (row.id)}
										{@const rank = (currentPage - 1) * perPage + i + 1}
										<Table.Row
											class="hover:bg-muted/50 border-b-0 transition-colors"
										>
											<Table.Cell class="align-middle font-medium">
												<div class="flex w-16 items-center gap-3">
													<span
														class={`text-xl font-black tabular-nums tracking-tighter drop-shadow-sm ${rank > 3 ? 'text-muted-foreground' : ''}`}
														style={rank === 1
															? 'color: #fbbf24; text-shadow: 0 0 10px rgba(251,191,36,0.3);'
															: rank === 2
																? 'color: #94a3b8; text-shadow: 0 0 10px rgba(148,163,184,0.3);'
																: rank === 3
																	? 'color: #cd7f32; text-shadow: 0 0 10px rgba(205,127,50,0.3);'
																	: ''}
													>
														#{rank}
													</span>
												</div>
											</Table.Cell>

											<Table.Cell class="py-3">
												<a
													href={authState.userMode ? `/account/${row.id}` : `/team/${row.id}`}
													class="flex items-center gap-3 decoration-primary/50 underline-offset-4 hover:underline"
												>
													<div class="relative">
														<div
															class="border-border h-8 w-8 shrink-0 overflow-hidden rounded-full border"
														>
															<GeneratedAvatar seed={row.name} class="h-full w-full" />
														</div>

														{#if row.country}
															{@const iso2 = getCountryIso2(row.country)}
															<div
																class="bg-background border-border absolute -bottom-1 -left-1 flex h-3.5 w-5 items-center justify-center overflow-hidden rounded-[2px] border-[0.5px] shadow-sm"
															>
																{#if iso2}
																	<CountryFlag
																		country={iso2}
																		width={32}
																		height={32}
																		class="h-full w-full object-cover"
																	/>
																{:else}
																	<Globe class="text-muted-foreground h-2 w-2" />
																{/if}
															</div>
                                                            <span class="sr-only">{row.country}</span>
														{/if}
													</div>
														<span class="text-foreground font-semibold">
															{truncateName(row.name)}
														</span>
												</a>
											</Table.Cell>

											<Table.Cell>
												{#if Array.isArray(row.badges) && row.badges.length}
													<div class="flex flex-wrap gap-1">
														{#each row.badges as b}
															<Tooltip.Root>
																<Tooltip.Trigger>
																	<span
																		class="bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
																		>{b.name}</span
																	>
																</Tooltip.Trigger>
																{#if b.description}
																	<Tooltip.Content>
																		<p>{b.description}</p>
																	</Tooltip.Content>
																{/if}
															</Tooltip.Root>
														{/each}
													</div>
												{:else}
													<span class="text-muted-foreground text-xs italic">-</span>
												{/if}
											</Table.Cell>

											<Table.Cell class="text-right">
												<div
													class="font-mono text-sm font-medium tabular-nums leading-none tracking-tight"
												>
													{row.score?.toLocaleString('en-GB') ?? 0} pts
												</div>
											</Table.Cell>
										</Table.Row>
									{/each}
								{/if}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Pagination -->
		{#if count > perPage}
			<Pagination.Root
				{count}
				{perPage}
				page={currentPage}
				onPageChange={handlePageChange}
				siblingCount={1}
				class="mt-4"
			>
				{#snippet children({ pages, currentPage: pageNum })}
					<div class="flex w-full justify-center overflow-x-auto py-4" id="pagination-controls">
						<Pagination.Content class="gap-4">
							<Pagination.Item class="mx-2">
								<Pagination.PrevButton class="h-9 w-9 cursor-pointer" />
							</Pagination.Item>

							{#each pages as page (page.key)}
								{#if page.type === 'ellipsis'}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link
											{page}
											isActive={pageNum === page.value}
											class="data-[selected]:bg-foreground data-[selected]:text-background h-9 w-9 cursor-pointer transition-all data-[selected]:shadow-md"
										>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}

							<Pagination.Item class="mx-2">
								<Pagination.NextButton class="h-9 w-9 cursor-pointer" />
							</Pagination.Item>
						</Pagination.Content>
					</div>
				{/snippet}
			</Pagination.Root>
		{/if}
	{/if}
</div>
