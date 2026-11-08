<script lang="ts">
	import {
		getChallenges,
		deleteChallenge,
		toggleChallengesHidden,
		groupByCategory
	} from '$lib/challenges';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Pencil, RefreshCw, UserCog, Eye, EyeOff, ChevronDown } from '@lucide/svelte';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { goto } from '$app/navigation';
	import AuthorTags from '$lib/components/challenges/AuthorTags.svelte';

	let challenges = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let togglingHidden = $state(false);

	const isAdmin = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');
	const grouped = $derived.by(() => groupByCategory(challenges));
	const queryClient = useQueryClient();

	async function loadChallenges() {
		if (!isAdmin) return;
		loading = true;
		error = null;
		selectedIds = new Set();
		try {
			// Admins/Authors get all challenges, even hidden ones.
			challenges = await getChallenges();
		} catch (err: any) {
			error = err?.message ?? 'Failed to load challenges';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadChallenges();
	});

	async function removeChallenge(challId: number) {
		if (!confirm('Are you sure you want to permanently delete this challenge?')) return;

		try {
			await deleteChallenge(challId);
			showSuccess('Challenge deleted successfully.');
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			loadChallenges();
		} catch (err: any) {
			showError(err, 'Failed to delete challenge.');
		}
	}

	async function bulkToggleHidden() {
		if (selectedIds.size === 0) return;
		togglingHidden = true;
		try {
			await toggleChallengesHidden([...selectedIds]);
			showSuccess(`Toggled hidden for ${selectedIds.size} challenge(s).`);
			queryClient.invalidateQueries({ queryKey: ['challenges'] });
			loadChallenges();
		} catch (err: any) {
			showError(err, 'Failed to toggle challenges.');
		} finally {
			togglingHidden = false;
		}
	}

	function toggleSelect(id: number) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function openEdit(chall: any) {
		goto(`/admin/challenges/${chall.id}/edit`);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Challenges</h1>
			<p class="text-muted-foreground mt-1">Manage global challenges and categories</p>
		</div>
		<div class="flex items-center gap-3">
			{#if selectedIds.size > 0}
				<Button
					variant="outline"
					size="sm"
					onclick={bulkToggleHidden}
					disabled={togglingHidden}
					class="gap-2"
				>
					{#if togglingHidden}
						<Spinner class="h-4 w-4" />
					{:else}
						<EyeOff class="h-4 w-4" />
					{/if}
					Toggle hidden ({selectedIds.size})
				</Button>
			{/if}

			<Button variant="outline" size="sm" onclick={loadChallenges} disabled={loading}>
				<RefreshCw class="mr-2 h-4 w-4 {loading ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if loading && challenges.length === 0}
		<div class="flex flex-col items-center justify-center py-12">
			<Spinner class="mb-4 h-8 w-8" />
			<p class="text-muted-foreground">Loading challenges...</p>
		</div>
	{:else if error && challenges.length === 0}
		<div class="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4">
			<p class="font-semibold">Error loading challenges</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if challenges.length === 0}
		<Card.Root class="text-muted-foreground p-8 text-center">No challenges found.</Card.Root>
	{:else}
		<div class="space-y-3">
			{#each grouped as [category, items]}
				{@const isCollapsed = uiStore.isAdminCategoryCollapsed(category)}
				<div>
					<h2 class="mb-1">
						<button
							type="button"
							onclick={() => uiStore.toggleAdminCategory(category)}
							class="text-muted-foreground/60 hover:text-foreground flex items-center gap-1.5 py-0.5 text-xs font-black uppercase tracking-tighter transition-colors select-none"
							aria-expanded={!isCollapsed}
							aria-label={`Toggle ${category} category`}
						>
							<ChevronDown
								class="h-3.5 w-3.5 transition-transform duration-200 {isCollapsed ? '-rotate-90' : ''}"
							/>
							<span>{category}</span>
							<span class="text-[11px] font-semibold opacity-60">({items.length})</span>
						</button>
					</h2>
					{#if !isCollapsed}
						<Card.Root class="overflow-hidden border-0 shadow-sm">
							<Card.Content class="p-0">
								<div class="overflow-x-auto">
									<Table.Root>
										<Table.Header class="bg-transparent [&_tr]:border-b-0">
											<Table.Row class="border-none hover:bg-transparent">
												<Table.Head
													class="text-muted-foreground/70 h-8 w-[40px] py-1 pl-4 text-[10px] font-bold uppercase tracking-wider hidden sm:table-cell"
												></Table.Head>
												<Table.Head
													class="text-muted-foreground/70 h-8 w-[60px] py-1 text-[10px] font-bold uppercase tracking-wider hidden sm:table-cell"
													>ID</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 pl-4 sm:pl-0 text-[10px] font-bold uppercase tracking-wider"
													>Name</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 text-[10px] font-bold uppercase tracking-wider hidden sm:table-cell"
													>Author tags</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 text-[10px] font-bold uppercase tracking-wider"
													>Visible</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 text-right text-[10px] font-bold uppercase tracking-wider"
													>Points</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 text-right text-[10px] font-bold uppercase tracking-wider"
													>Solves</Table.Head
												>
												<Table.Head
													class="text-muted-foreground/70 h-8 py-1 pr-4 text-right text-[10px] font-bold uppercase tracking-wider"
													>Actions</Table.Head
												>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each items as chall (chall.id)}
												<Table.Row
													class="group border-none transition-colors {selectedIds.has(chall.id)
														? 'bg-muted/30'
														: ''}"
												>
													<Table.Cell class="py-1 pl-4 hidden sm:table-cell">
														<Checkbox
															checked={selectedIds.has(chall.id)}
															onCheckedChange={() => toggleSelect(chall.id)}
														/>
													</Table.Cell>
													<Table.Cell class="text-muted-foreground/60 py-1 font-medium hidden sm:table-cell">{chall.id}</Table.Cell>
													<Table.Cell class="py-1 pl-4 sm:pl-0 font-bold">
														{chall.name}
														{#if chall.authors && chall.authors.length > 0}
															<div
																class="text-muted-foreground/50 flex items-center gap-1.5 text-xs font-medium"
															>
																<UserCog class="h-3 w-3" />
																{chall.authors.join(', ')}
															</div>
														{/if}
													</Table.Cell>
													<Table.Cell class="py-1 hidden sm:table-cell">
														<AuthorTags tags={chall.author_tags} />
													</Table.Cell>
													<Table.Cell class="py-1">
														{#if chall.hidden}
															<EyeOff class="h-4 w-4 text-amber-500 sm:hidden" />
															<Badge
																class="hidden sm:inline-flex border-amber-500/20 bg-amber-500/10 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-amber-500"
																>Hidden</Badge
															>
														{:else}
															<Eye class="h-4 w-4 text-green-500 sm:hidden" />
															<Badge
																class="hidden sm:inline-flex border-green-500/20 bg-green-500/10 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-green-500"
																>Visible</Badge
															>
														{/if}
													</Table.Cell>
													<Table.Cell class="text-primary py-1 text-right font-mono font-bold"
														>{chall.points ?? chall.max_points}</Table.Cell
													>
													<Table.Cell class="text-foreground py-1 text-right font-mono font-bold"
														>{chall.solves ?? 0}</Table.Cell
													>
													<Table.Cell class="space-x-1 whitespace-nowrap py-1 pr-4 text-right">
														<Button
															variant="ghost"
															size="icon"
															class="text-muted-foreground hover:text-primary h-7 w-7 transition-colors"
															onclick={() => openEdit(chall)}
														>
															<Pencil class="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															class="text-muted-foreground hover:text-destructive h-7 w-7 transition-colors"
															onclick={() => removeChallenge(chall.id)}
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
			{/each}
		</div>
	{/if}
</div>
