<script lang="ts">
	import {
		getChallenges,
		deleteChallenge,
		getCategories,
		toggleChallengesHidden
	} from '$lib/challenges';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Pencil, RefreshCw, UserCog, Eye, EyeOff } from '@lucide/svelte';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { goto } from '$app/navigation';

	let challenges = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let togglingHidden = $state(false);

	let editSheetOpen = $state(false);
	let selectedChallenge = $state<any>(null);

	const isAdmin = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');

	let categoriesList = $state<{ label: string; value: string }[]>([]);

	async function loadChallenges() {
		if (!isAdmin) return;
		loading = true;
		error = null;
		selectedIds = new Set();
		try {
			// Admins/Authors get all challenges, even hidden ones.
			challenges = await getChallenges();
			const cats = await getCategories();
			categoriesList = (cats || []).map((c: any) => ({ label: c.name, value: c.name }));
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
			await deleteChallenge(challId.toString());
			showSuccess('Challenge deleted successfully.');
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
		goto(`/admin/challenges/${chall.id}`);
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
					Toggle Hidden ({selectedIds.size})
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
		<Card.Root class="text-muted-foreground p-8 text-center">
			No challenges found.
		</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="border-none hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 w-[40px] text-[10px] font-bold uppercase tracking-wider"
								></Table.Head>
								<Table.Head
									class="text-muted-foreground/70 w-[60px] text-[10px] font-bold uppercase tracking-wider"
									>ID</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Name</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Category</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Status</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-right text-[10px] font-bold uppercase tracking-wider"
									>Points</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-right text-[10px] font-bold uppercase tracking-wider"
									>Solves</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-right text-[10px] font-bold uppercase tracking-wider"
									>Actions</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each challenges as chall (chall.id)}
								<Table.Row
									class="group border-none transition-colors {selectedIds.has(chall.id)
										? 'bg-muted/30'
										: ''}"
								>
									<Table.Cell>
										<Checkbox
											checked={selectedIds.has(chall.id)}
											onCheckedChange={() => toggleSelect(chall.id)}
										/>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground/60 font-medium">{chall.id}</Table.Cell>
									<Table.Cell class="font-bold">
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
									<Table.Cell>
										<Badge
											variant="outline"
											class="px-2 py-0 text-[10px] font-bold uppercase tracking-wider"
										>
											{chall.category}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										{#if chall.hidden}
											<Badge
												class="border-amber-500/20 bg-amber-500/10 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-amber-500"
												>Hidden</Badge
											>
										{:else}
											<Badge
												class="border-green-500/20 bg-green-500/10 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-green-500"
												>Visible</Badge
											>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-primary text-right font-mono font-bold"
										>{chall.points ?? chall.max_points}</Table.Cell
									>
									<Table.Cell class="text-foreground text-right font-mono font-bold"
										>{chall.solves ?? 0}</Table.Cell
									>
									<Table.Cell class="space-x-1 whitespace-nowrap text-right">
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-primary h-8 w-8 transition-colors"
											onclick={() => openEdit(chall)}
										>
											<Pencil class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive h-8 w-8 transition-colors"
											onclick={() => removeChallenge(chall.id)}
										>
											<Trash2 class="h-4 w-4" />
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




