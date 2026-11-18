<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	let {
		solves = [],
		totalCategoryChallenges = []
	}: {
		solves?: any[];
		totalCategoryChallenges?: { category: string; count: number }[];
	} = $props();

	const categories = $derived.by(() => {
		if (!Array.isArray(totalCategoryChallenges) || totalCategoryChallenges.length === 0) {
			return [];
		}
		const solveCounts: Record<string, number> = {};
		for (const s of solves || []) {
			if (s?.category) solveCounts[s.category] = (solveCounts[s.category] || 0) + 1;
		}
		return totalCategoryChallenges
			.map((tc) => ({
				cat: tc.category,
				count: solveCounts[tc.category] || 0,
				total: tc.count || 1,
				pct: Math.round(((solveCounts[tc.category] || 0) / (tc.count || 1)) * 100)
			}))
			.sort((a, b) => b.pct - a.pct || b.count - a.count);
	});
</script>

<Card.Root class="bg-card flex-1 border-0 shadow-sm">
	<Card.Header class="pb-2">
		<Card.Title class="text-muted-foreground text-sm font-medium uppercase tracking-wider">
			Category Breakdown
		</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if categories.length > 0}
			<div class="grid gap-4 sm:grid-cols-2">
				{#each categories as c (c.cat)}
					<div class="space-y-1">
						<div class="flex justify-between text-xs font-semibold">
							<span class="text-foreground/90">{c.cat}</span>
							<span class={c.pct === 100 ? 'text-primary font-bold' : 'text-muted-foreground'}>
								{c.count} / {c.total} ({c.pct}%)
							</span>
						</div>
						<div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
							<div
								class="bg-primary h-full transition-all duration-500"
								style="width: {c.pct}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">No solves yet.</p>
		{/if}
	</Card.Content>
</Card.Root>
