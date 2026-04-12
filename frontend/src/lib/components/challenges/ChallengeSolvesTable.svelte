<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Droplet, Trophy } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/auth';
	import type { Solve } from '$lib/types';
	import EmptyState from '$lib/components/ui/empty-state.svelte';

	let { solves = [] }: { solves?: Solve[] } = $props();

	const t = (s: Solve) => new Date(s.timestamp).getTime();

	function goItem(id: number | undefined, ev?: Event) {
		if (!id) return;
		if (ev) ev.preventDefault();
		authState.userMode ? goto(`/account/${id}`) : goto(`/team/${id}`);
	}

	function truncateName(name: string, maxLength = 32): string {
		if (!name || name.length <= maxLength) return name;
		return name.slice(0, maxLength) + '...';
	}

	let sortedSolves = $derived(solves.slice().sort((a, b) => t(a) - t(b)));
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
							onclick={(e) => goItem(s.id, e)}
							class="cursor-pointer font-medium hover:underline"
						>
							{truncateName(s.name)}
						</a>
					</Table.Cell>
					<Table.Cell
						class="text-muted-foreground whitespace-nowrap py-2 text-right font-mono text-xs"
					>
						{new Date(t(s)).toLocaleString('en-GB')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
