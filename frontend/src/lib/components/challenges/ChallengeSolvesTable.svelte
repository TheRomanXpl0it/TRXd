<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Droplet, Trophy } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth';
	import type { Solve } from '$lib/types';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import { formatDate, truncateText } from '$lib/utils/formatting';

	let { solves = [] }: { solves?: Solve[] } = $props();

	const timestampOf = (s: Solve) => {
		const ms = new Date(s.timestamp).getTime();
		return Number.isNaN(ms) ? 0 : ms;
	};

	let sortedSolves = $derived(solves.slice().sort((a, b) => timestampOf(a) - timestampOf(b)));
</script>

{#if sortedSolves.length === 0}
	<Table.Root class="w-full">
		<Table.Body>
			<Table.Row class="border-b-0">
				<Table.Cell class="p-0">
					<EmptyState
						icon={Trophy}
						title="No solves yet"
						description="Be the first to solve this challenge!"
					/>
				</Table.Cell>
			</Table.Row>
		</Table.Body>
	</Table.Root>
{:else}
	<div class="w-full overflow-x-auto">
		<Table.Root class="w-full">
			<Table.Header class="bg-transparent [&_tr]:border-b-0">
				<Table.Row class="hover:bg-transparent">
					<Table.Head
						class="text-muted-foreground/70 w-[10%] text-[10px] font-bold uppercase tracking-wider"
						>#</Table.Head
					>
					<Table.Head
						class="text-muted-foreground/70 w-[50%] text-[10px] font-bold uppercase tracking-wider"
						>{authState.userMode ? 'Player' : 'Team'}</Table.Head
					>
					<Table.Head
						class="text-muted-foreground/70 w-[40%] text-right text-[10px] font-bold uppercase tracking-wider"
						>Date</Table.Head
					>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#each sortedSolves as s, i}
					<Table.Row class="border-b-0 transition-colors">
						<Table.Cell class="font-medium">
							{#if i === 0}
								<Droplet class="h-4 w-4 text-red-500" />
							{:else}
								<span class="text-muted-foreground font-mono text-xs">{i + 1}</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="py-2">
							<a
								href={authState.userMode ? '/account/' + s.id : '/team/' + s.id}
								class="cursor-pointer font-medium hover:underline"
							>
								{truncateText(s.name)}
							</a>
						</Table.Cell>
						<Table.Cell
							class="text-muted-foreground whitespace-nowrap py-2 text-right font-mono text-xs"
						>
							{formatDate(s.timestamp)}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
