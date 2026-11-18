<script lang="ts">
	import { mergeProps } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Tag } from '@lucide/svelte';

	let {
		filterTags = $bindable([]),
		allTags = [],
		size = 'default'
	}: {
		filterTags: string[];
		allTags: string[];
		size?: 'default' | 'sm';
	} = $props();

	let open = $state(false);
	let tagSearch = $state('');

	const filteredTags = $derived(
		tagSearch ? allTags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase())) : allTags
	);

	function toggleTag(value: string) {
		const idx = filterTags.indexOf(value);
		if (idx > -1) {
			filterTags = filterTags.filter((t) => t !== value);
		} else {
			filterTags = [...filterTags, value];
		}
	}

	const btnClass = $derived(
		size === 'sm' ? 'h-8 w-8' : 'h-9 w-9 md:h-10 md:w-10'
	);
	const iconClass = $derived(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4');
</script>

<Popover.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) tagSearch = '';
	}}
>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props: tooltipProps })}
				<Popover.Trigger>
					{#snippet child({ props: popoverProps })}
						<Button
							{...mergeProps(tooltipProps, popoverProps)}
							variant={filterTags.length > 0 ? 'secondary' : 'outline'}
							size="icon"
							class="{btnClass} shrink-0 cursor-pointer"
							aria-label={filterTags.length > 0 ? `${filterTags.length} tags selected` : 'Filter by tags'}
							title="Filter by tags"
							data-testid="filter-by-tags"
						>
							<Tag class="{iconClass} shrink-0" aria-hidden="true" />
						</Button>
					{/snippet}
				</Popover.Trigger>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>Filter by tags</Tooltip.Content>
	</Tooltip.Root>
	<Popover.Content class="w-[260px] p-1" align="end">
		<div class="px-2 py-1.5">
			<Input bind:value={tagSearch} placeholder="Search tags..." class="h-8" />
		</div>
		{#if filteredTags.length === 0}
			<div class="text-muted-foreground py-6 text-center text-sm">No tags found.</div>
		{:else}
			<div class="max-h-[300px] overflow-y-auto px-1">
				{#each filteredTags as item (item)}
					<button
						type="button"
						class="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
						onclick={() => toggleTag(item)}
					>
						<Checkbox checked={filterTags.includes(item)} aria-label="Filter by {item}" />
						<span class="ml-2">{item}</span>
					</button>
				{/each}
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
