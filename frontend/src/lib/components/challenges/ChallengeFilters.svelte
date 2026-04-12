<script lang="ts">
	import { Button } from '@/components/ui/button';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { X, Filter, Shapes } from '@lucide/svelte';
	import VirtualList from '@sveltejs/svelte-virtual-list';

	let {
		search = $bindable(''),
		filterCategories = $bindable([]),
		filterTags = $bindable([]),
		categories = [],
		allTags = [],
		activeFiltersCount = 0,
		isAllExpanded = false
	}: {
		search: string;
		filterCategories: string[];
		filterTags: string[];
		categories: Array<{ value: string; label: string }>;
		allTags: string[];
		activeFiltersCount: number;
		isAllExpanded?: boolean;
	} = $props();

	let tagsOpen = $state(false);
	let categoriesOpen = $state(false);
	let categorySearch = $state('');
	let tagSearch = $state('');

	const filteredCategories = $derived(
		categorySearch
			? categories
					.filter((c) => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
					.sort()
			: categories
	);

	const filteredTags = $derived(
		tagSearch ? allTags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase())) : allTags
	);

	function clearFilters() {
		filterCategories = [];
		filterTags = [];
	}

	function toggleCategory(value: string) {
		const idx = filterCategories.indexOf(value);
		if (idx > -1) {
			filterCategories.splice(idx, 1);
			filterCategories = [...filterCategories];
		} else {
			filterCategories = [...filterCategories, value];
		}
	}

	function toggleTag(value: string) {
		const idx = filterTags.indexOf(value);
		if (idx > -1) {
			filterTags.splice(idx, 1);
			filterTags = [...filterTags];
		} else {
			filterTags = [...filterTags, value];
		}
	}
</script>

<div class="mb-4 flex w-full flex-wrap items-center gap-2 md:mb-8 md:gap-4">
	<div class="relative min-w-0 flex-1 md:flex-[4] lg:flex-[10]">
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

	<div class="flex shrink-0 flex-nowrap items-center gap-1.5 md:gap-2">
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Popover.Root bind:open={categoriesOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								class="flex h-9 shrink-0 cursor-pointer items-center gap-1 px-3 md:h-10 md:px-4"
								aria-label={filterCategories.length > 0
									? `${filterCategories.length} categories selected`
									: 'Filter by categories'}
							>
								<Shapes class="h-4 w-4 shrink-0" aria-hidden="true" />
								<span class="hidden sm:inline">Categories</span>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-[260px] p-1">
						<div class="px-2 py-1.5">
							<Input bind:value={categorySearch} placeholder="Search categories..." class="h-8" />
						</div>
						{#if filteredCategories.length === 0}
							<div class="text-muted-foreground py-6 text-center text-sm">No categories found.</div>
						{:else if filteredCategories.length > 20}
							<div class="px-1" style="height: 300px;">
								<VirtualList items={filteredCategories} let:item>
									<button
										type="button"
										class="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
										onclick={() => toggleCategory(item.value)}
									>
										<Checkbox
											checked={filterCategories.includes(item.value)}
											aria-label="Filter by {item.label}"
										/>
										<span class="ml-2">{item.label}</span>
									</button>
								</VirtualList>
							</div>
						{:else}
							<div class="max-h-[300px] overflow-y-auto px-1">
								{#each filteredCategories as item (item.value)}
									<button
										type="button"
										class="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
										onclick={() => toggleCategory(item.value)}
									>
										<Checkbox
											checked={filterCategories.includes(item.value)}
											aria-label="Filter by {item.label}"
										/>
										<span class="ml-2">{item.label}</span>
									</button>
								{/each}
							</div>
						{/if}
					</Popover.Content>
				</Popover.Root>
			</Tooltip.Trigger>
			<Tooltip.Content>Filter by Category</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				<Popover.Root bind:open={tagsOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								class="flex h-9 shrink-0 items-center gap-1 px-3 md:h-10 md:px-4"
								aria-label={filterTags.length > 0
									? `${filterTags.length} tags selected`
									: 'Filter by tags'}
							>
								<Filter class="h-4 w-4 shrink-0" aria-hidden="true" />
								<span class="hidden sm:inline">Tags</span>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-[260px] p-1">
						<div class="px-2 py-1.5">
							<Input bind:value={tagSearch} placeholder="Search tags..." class="h-8" />
						</div>
						{#if filteredTags.length === 0}
							<div class="text-muted-foreground py-6 text-center text-sm">No tags found.</div>
						{:else if filteredTags.length > 20}
							<div class="px-1" style="height: 300px;">
								<VirtualList items={filteredTags} let:item>
									<button
										type="button"
										class="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
										onclick={() => toggleTag(item)}
									>
										<Checkbox checked={filterTags.includes(item)} aria-label="Filter by {item}" />
										<span class="ml-2">{item}</span>
									</button>
								</VirtualList>
							</div>
						{:else}
							<div class="max-h-[300px] overflow-y-auto px-1">
								{#each filteredTags as item}
									<button
										type="button"
										class="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
			</Tooltip.Trigger>
			<Tooltip.Content>Filter by Tag</Tooltip.Content>
		</Tooltip.Root>

		{#if activeFiltersCount > 0}
			<Button
				variant="ghost"
				size="icon"
				class="h-9 shrink-0 cursor-pointer md:h-10"
				onclick={clearFilters}
				aria-label="Clear all filters ({activeFiltersCount} active)"
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</Button>
		{/if}
	</div>
</div>
