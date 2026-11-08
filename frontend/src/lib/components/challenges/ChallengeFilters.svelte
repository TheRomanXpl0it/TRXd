<script lang="ts">
	import { Button } from '@/components/ui/button';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { X, Eye, EyeOff, LockKeyhole } from '@lucide/svelte';
	import TagFilterPopover from './TagFilterPopover.svelte';
	import ViewToggle from './ViewToggle.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';

	let {
		search = $bindable(''),
		filterTags = $bindable([]),
		showHidden = $bindable(true),
		canSeeHidden = false,
		allTags = [],
		activeFiltersCount = 0
	}: {
		search: string;
		filterTags: string[];
		showHidden?: boolean;
		canSeeHidden?: boolean;
		allTags: string[];
		activeFiltersCount?: number;
	} = $props();

	function clearFilters() {
		filterTags = [];
	}
</script>

<div class="mb-4 flex w-full flex-col gap-3 md:mb-8 md:flex-row md:items-center md:gap-4">
	<div class="relative min-w-0 flex-1">
		<label for="search-challenges" class="sr-only">Search challenges</label>
		<Input
			id="search-challenges"
			placeholder="Search..."
			bind:value={search}
			class="h-9 w-full pr-8 md:h-10"
			aria-label="Search challenges"
		/>
		{#if search}
			<button
				type="button"
				onclick={() => (search = '')}
				class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
				aria-label="Clear search"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-1.5 md:gap-2">
		{#if canSeeHidden}
			<!-- 1. Hidden challenges toggle (authors/admins only, eye icon only) -->
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={showHidden ? 'outline' : 'secondary'}
						size="icon"
						class="h-9 w-9 md:h-10 md:w-10 shrink-0 cursor-pointer"
						onclick={() => (showHidden = !showHidden)}
						aria-label={showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}
						title={showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}
						data-testid="toggle-hidden-challenges"
					>
						{#if showHidden}
							<Eye class="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
						{:else}
							<EyeOff class="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
						{/if}
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>{showHidden ? 'Hide hidden challenges' : 'Show hidden challenges'}</Tooltip.Content>
			</Tooltip.Root>

			<!-- 2. Author tags toggle (authors/admins only) -->
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={uiStore.showAuthorTags ? 'outline' : 'secondary'}
						size="icon"
						class="h-9 w-9 md:h-10 md:w-10 shrink-0 cursor-pointer"
						onclick={() => uiStore.toggleAuthorTags()}
						aria-label={uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}
						title={uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}
						data-testid="toggle-author-tags"
					>
						<LockKeyhole
							class="h-4 w-4 shrink-0 {uiStore.showAuthorTags ? '' : 'opacity-40'}"
							aria-hidden="true"
						/>
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>{uiStore.showAuthorTags ? 'Hide author tags' : 'Show author tags'}</Tooltip.Content>
			</Tooltip.Root>
		{/if}

		<!-- 3. Tag filter (icon-only button, hover "Filter by tags") -->
		<TagFilterPopover bind:filterTags {allTags} />

		<!-- 4. Grid/Sidebar toggle (split-button for all roles) -->
		<ViewToggle />

		{#if activeFiltersCount > 0 || filterTags.length > 0}
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9 md:h-10 md:w-10 shrink-0 cursor-pointer"
				onclick={clearFilters}
				aria-label="Clear all filters"
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</Button>
		{/if}
	</div>
</div>
