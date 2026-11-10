<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { getCategories, createCategory, deleteCategory, updateCategory } from '$lib/categories';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { siteContent } from '$lib/site-content';
	import { onMount } from 'svelte';
	import { Plus, Trash2, Pencil, RefreshCw } from '@lucide/svelte';

	let categories = $state<string[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let creating = $state(false);
	let categoryName = $state('');

	const queryClient = useQueryClient();

	async function loadCategories() {
		loading = true;
		error = null;
		try {
			const res = await getCategories();
			categories = [...res].sort((a, b) => a.localeCompare(b));
		} catch (err: any) {
			error = err?.message ?? 'Failed to load categories';
			showError(err, 'Failed to load categories.');
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		const name = categoryName.trim();
		if (!name) return;

		creating = true;
		try {
			await createCategory(name);
			showSuccess(`Category "${name}" created.`);
			categoryName = '';
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			await loadCategories();
		} catch (err: any) {
			showError(err, 'Failed to create category.');
		} finally {
			creating = false;
		}
	}

	async function handleDelete(name: string) {
		if (!confirm(`Are you sure you want to delete the category "${name}"?`)) return;

		try {
			await deleteCategory(name);
			showSuccess(`Category "${name}" deleted.`);
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			await loadCategories();
		} catch (err: any) {
			showError(err, 'Failed to delete category.');
		}
	}

	async function handleRename(name: string) {
		const newName = prompt(`Enter new name for category "${name}":`, name);
		if (!newName || !newName.trim() || newName === name) return;

		try {
			await updateCategory(name, newName.trim());
			showSuccess(`Category renamed to "${newName.trim()}".`);
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			await loadCategories();
		} catch (err: any) {
			showError(err, 'Failed to rename category.');
		}
	}

	onMount(loadCategories);
</script>

<svelte:head>
	<title>Categories | {$siteContent.brand.adminTitleSuffix}</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Categories</h1>
			<p class="text-muted-foreground mt-1">Manage challenge categories for the platform</p>
		</div>
		<Button variant="outline" size="sm" onclick={loadCategories} disabled={loading}>
			<RefreshCw class="mr-2 h-4 w-4 {loading ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title class="text-lg">Add new category</Card.Title>
			<Card.Description>Create a new category for challenges</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleCreate} class="flex max-w-md items-center gap-3">
				<div class="grid flex-1 gap-1.5">
					<Label for="name" class="sr-only">Category Name</Label>
					<Input
						id="name"
						placeholder="e.g. Pwn, Web, Crypto"
						bind:value={categoryName}
						disabled={creating}
						class="h-9"
					/>
				</div>
				<Button type="submit" size="sm" disabled={creating || !categoryName.trim()} class="shrink-0 gap-1.5">
					{#if creating}
						<Spinner class="h-4 w-4" />
						Adding...
					{:else}
						<Plus class="h-4 w-4" />
						Add
					{/if}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if loading && categories.length === 0}
		<div class="flex flex-col items-center justify-center py-12">
			<Spinner class="mb-4 h-8 w-8" />
			<p class="text-muted-foreground">Loading categories...</p>
		</div>
	{:else if error && categories.length === 0}
		<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
			<p class="font-semibold">Error loading categories</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if categories.length === 0}
		<Card.Root class="p-8 text-center text-muted-foreground">No categories found.</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="w-full overflow-x-auto">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="border-none hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 h-8 py-1 pl-4 text-[10px] font-bold uppercase tracking-wider"
									>Name</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 h-8 py-1 pr-4 text-right text-[10px] font-bold uppercase tracking-wider"
									>Actions</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each categories as name (name)}
								<Table.Row class="hover:bg-muted/30 group border-none transition-colors">
									<Table.Cell class="py-1 pl-4 font-bold">{name}</Table.Cell>
									<Table.Cell class="space-x-1 whitespace-nowrap py-1 pr-4 text-right">
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-primary h-7 w-7 transition-colors"
											onclick={() => handleRename(name)}
											aria-label={`Rename ${name}`}
										>
											<Pencil class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive h-7 w-7 transition-colors"
											onclick={() => handleDelete(name)}
											aria-label={`Delete ${name}`}
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
