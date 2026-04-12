<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { getCategories, createCategory, deleteCategory } from '$lib/categories';
	import { onMount } from 'svelte';
	import { Plus, Trash2, FolderTree } from '@lucide/svelte';

	let categories = $state<any[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let categoryName = $state('');

	async function loadCategories() {
		loading = true;
		try {
			const res = await getCategories();
			categories = res.map((c: any) => (typeof c === 'string' ? { name: c } : c));
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to load categories');
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		if (!categoryName.trim()) return;

		creating = true;
		try {
			await createCategory(categoryName.trim());
			toast.success(`Category "${categoryName}" created`);
			categoryName = '';
			await loadCategories();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to create category');
		} finally {
			creating = false;
		}
	}

	async function handleDelete(name: string) {
		if (!confirm(`Are you sure you want to delete the category "${name}"?`)) return;

		try {
			await deleteCategory(name);
			toast.success(`Category "${name}" deleted`);
			await loadCategories();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to delete category');
		}
	}

	onMount(loadCategories);
</script>

<svelte:head>
	<title>Category Management | TRXd Admin</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Category Management</h1>
		<p class="text-muted-foreground mt-2">Manage challenge categories for the platform.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Add New Category</Card.Title>
			<Card.Description>Create a new category for challenges.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleCreate} class="flex items-end gap-4 max-w-md">
				<div class="grid w-full gap-1.5">
					<Label for="name">Name</Label>
					<Input
						id="name"
						placeholder="e.g. Pwn, Web, Crypto"
						bind:value={categoryName}
						disabled={creating}
					/>
				</div>
				<Button type="submit" disabled={creating || !categoryName.trim()} class="shrink-0">
					{#if creating}
						<Spinner class="mr-2 h-4 w-4" />
						Adding...
					{:else}
						<Plus class="mr-2 h-4 w-4" />
						Add
					{/if}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Existing Categories</Card.Title>
			<Card.Description>A list of all currently registered categories.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="flex h-32 items-center justify-center">
					<Spinner class="h-8 w-8" />
				</div>
			{:else if categories.length === 0}
				<div class="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
					<FolderTree class="h-10 w-10 opacity-20" />
					<p>No categories found.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header class="bg-transparent [&_tr]:border-b-0">
						<Table.Row class="hover:bg-transparent border-none">
							<Table.Head class="text-muted-foreground/70 bg-transparent text-[10px] font-bold uppercase tracking-wider">Name</Table.Head>
							<Table.Head class="text-muted-foreground/70 bg-transparent text-right text-[10px] font-bold uppercase tracking-wider">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each categories as cat}
							<Table.Row class="group border-none transition-colors hover:bg-muted/50">
								<Table.Cell class="font-medium truncate max-w-[200px]">{cat.name}</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon"
										class="text-muted-foreground hover:text-destructive transition-colors h-8 w-8"
										onclick={() => handleDelete(cat.name)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
