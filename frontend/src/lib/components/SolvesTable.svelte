<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import StatusBadge from '$lib/components/ui/status-badge.svelte';
	import { ChartLine, Trophy } from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { formatDate, formatTimeSince, formatNumber, truncateText } from '$lib/utils/formatting';

	let {
		solves = [],
		members
	}: {
		solves?: any[];
		members?: any[];
	} = $props();

	type SortKey = 'name' | 'category' | 'points' | 'timestamp' | 'solver';

	const showSolver = $derived(Array.isArray(members));
	let sortKey = $state<SortKey>('timestamp');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const getPoints = (s: any) => formatNumber(s?.points ?? s?.value ?? s?.score);

	const memberNameById = $derived.by(() => {
		const map: Record<string, string> = {};
		if (!Array.isArray(members)) return map;
		for (const m of members) {
			const id = String(m?.id ?? m?.user_id ?? '');
			if (!id) continue;
			map[id] = String(m?.name ?? m?.username ?? m?.displayName ?? 'Unknown');
		}
		return map;
	});

	const solverName = (uid: any) => {
		const key = uid == null ? '' : String(uid);
		return memberNameById[key] ?? '-';
	};

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = key === 'timestamp' ? 'desc' : 'asc';
		}
	}

	const getSortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

	const sortedSolves = $derived.by(() => {
		const source = Array.isArray(solves) ? [...solves] : [];

		return source.sort((a: any, b: any) => {
			let valueA: any;
			let valueB: any;

			switch (sortKey) {
				case 'name':
					valueA = a?.name ?? '';
					valueB = b?.name ?? '';
					break;
				case 'category':
					valueA = a?.category ?? '';
					valueB = b?.category ?? '';
					break;
				case 'points':
					valueA = getPoints(a);
					valueB = getPoints(b);
					break;
				case 'solver':
					valueA = solverName(a?.user_id);
					valueB = solverName(b?.user_id);
					break;
				case 'timestamp':
					valueA = new Date(a?.timestamp ?? 0).getTime() || 0;
					valueB = new Date(b?.timestamp ?? 0).getTime() || 0;
					break;
			}

			if (valueA < valueB) return sortDir === 'asc' ? -1 : 1;
			if (valueA > valueB) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
	});
</script>

<div class="flex w-full flex-col">
	<div class="flex items-center gap-2 px-6 py-4">
		<ChartLine class="h-5 w-5 opacity-70" />
		<h3 class="text-xl font-semibold">Solves</h3>
	</div>

	<div class="mx-4 overflow-x-auto px-4 sm:mx-8 sm:px-6">
		<Table.Root class="w-full">
			<Table.Header class="bg-transparent [&_tr]:border-b-0">
				<Table.Row class="hover:bg-transparent">
					<Table.Head
						class="text-muted-foreground/70 cursor-pointer text-[10px] font-bold uppercase tracking-wider {showSolver
							? 'w-[28%]'
							: 'w-[40%]'}"
						onclick={() => toggleSort('name')}
					>
						Challenge{getSortArrow('name')}
					</Table.Head>
					<Table.Head
						class="text-muted-foreground/70 cursor-pointer text-[10px] font-bold uppercase tracking-wider {showSolver
							? 'w-[16%]'
							: 'w-[20%]'}"
						onclick={() => toggleSort('category')}
					>
						Category{getSortArrow('category')}
					</Table.Head>
					<Table.Head
						class="text-muted-foreground/70 cursor-pointer text-right text-[10px] font-bold uppercase tracking-wider {showSolver
							? 'w-[12%]'
							: 'w-[15%]'}"
						onclick={() => toggleSort('points')}
					>
						Points{getSortArrow('points')}
					</Table.Head>
					{#if showSolver}
						<Table.Head
							class="text-muted-foreground/70 w-[18%] cursor-pointer text-[10px] font-bold uppercase tracking-wider"
							onclick={() => toggleSort('solver')}
						>
							Solved by{getSortArrow('solver')}
						</Table.Head>
					{/if}
					<Table.Head
						class="text-muted-foreground/70 cursor-pointer text-right text-[10px] font-bold uppercase tracking-wider {showSolver
							? 'w-[26%]'
							: 'w-[25%]'}"
						onclick={() => toggleSort('timestamp')}
					>
						Ago{getSortArrow('timestamp')}
					</Table.Head>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#if sortedSolves.length === 0}
					<Table.Row class="border-b-0">
						<Table.Cell colspan={showSolver ? 5 : 4} class="p-0">
							<EmptyState
								icon={Trophy}
								title="No solves yet"
								description="Solve challenges to see them here"
							/>
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each sortedSolves as solve, i (solve.id ?? solve.timestamp ?? solve.name ?? i)}
						<Table.Row class="border-b-0 transition-colors">
							<Table.Cell class="font-medium">
								{#if solve.id}
									<a
										href="/challenges?id={solve.id}"
										class="cursor-pointer text-inherit no-underline hover:underline"
									>
										{truncateText(solve.name ?? '-')}
									</a>
								{:else}
									{truncateText(solve.name ?? '-')}
								{/if}
							</Table.Cell>
							<Table.Cell>
								<StatusBadge variant="category">{solve.category ?? '-'}</StatusBadge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="font-mono text-sm font-medium tabular-nums leading-none tracking-tight">
									{getPoints(solve)}
								</div>
							</Table.Cell>
							{#if showSolver}
								<Table.Cell>
									{#if solve.user_id}
										<a
											href="/account/{solve.user_id}"
											class="cursor-pointer text-inherit no-underline hover:underline"
										>
											{truncateText(solverName(solve.user_id))}
										</a>
									{:else}
										{truncateText(solverName(solve.user_id))}
									{/if}
								</Table.Cell>
							{/if}
							<Table.Cell class="text-right">
								<Tooltip.Root>
									<Tooltip.Trigger class="cursor-help">
										{formatTimeSince(solve.timestamp)}
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>{formatDate(solve.timestamp)}</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>
