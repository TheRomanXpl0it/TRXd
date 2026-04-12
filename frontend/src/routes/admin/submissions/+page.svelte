<script lang="ts">
	import { getSubmissions, deleteSubmission } from '$lib/challenges';
	import { authState } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, MessageSquareShare, RefreshCw, CheckCircle, XCircle, Droplet, Eye, EyeOff } from '@lucide/svelte';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';

	let submissions = $state<any[]>([]);
	let paginationInfo = $state<any>({ page: 1, pages: 1, total: 0 });
	let currentPage = $state(1);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deleting = $state<Record<string, boolean>>({});
	let expandedFlags = $state<Record<string, boolean>>({});

	const limit = 50;
	const count = $derived(paginationInfo.total);
	const perPage = $derived(limit);

	const isAdmin = $derived(authState.user?.role === 'Admin');

	async function loadSubmissions(page = 1) {
		if (!isAdmin) return;
		loading = true;
		error = null;
		try {
			const res = await getSubmissions(page, limit);
			submissions = Array.isArray(res?.submissions) ? res.submissions : [];
			paginationInfo = {
				page: page,
				pages: Math.ceil((res?.total || 0) / limit),
				total: res?.total || 0,
			};
			currentPage = page;
		} catch (err: any) {
			error = err?.message ?? 'Failed to load submissions';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadSubmissions(currentPage);
	});

	async function remove(id: number | string) {
		if (!confirm('Are you sure you want to delete this submission?')) return;
		if (deleting[id]) return;
		
		deleting[id] = true;
		try {
			await deleteSubmission(id);
			showSuccess('Submission deleted successfully.');
			loadSubmissions(currentPage);
		} catch (err: any) {
			showError(err, 'Failed to delete submission.');
		} finally {
			deleting[id] = false;
		}
	}
	
	$effect(() => {
		if (currentPage !== paginationInfo.page && !loading) {
			loadSubmissions(currentPage);
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Submissions</h1>
			<p class="text-muted-foreground mt-1">Review flag attempts and bloods</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => loadSubmissions(currentPage)} disabled={loading}>
				<RefreshCw class="mr-2 h-4 w-4 {loading ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if loading && submissions.length === 0}
		<div class="flex flex-col items-center justify-center py-12">
			<Spinner class="mb-4 h-8 w-8" />
			<p class="text-muted-foreground">Loading submissions...</p>
		</div>
	{:else if error && submissions.length === 0}
		<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
			<p class="font-semibold">Error loading submissions</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if submissions.length === 0}
		<Card.Root class="p-8 text-center text-muted-foreground">
			No submissions found.
		</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
				<Table.Root>
					<Table.Header class="bg-transparent [&_tr]:border-b-0">
						<Table.Row class="hover:bg-transparent border-none">
							<Table.Head class="text-muted-foreground/70 w-[60px] text-[10px] font-bold uppercase tracking-wider">ID</Table.Head>
							{#if !authState.userMode}
								<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">User</Table.Head>
							{/if}
							<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">Team</Table.Head>
							<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">Challenge</Table.Head>
							<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">Flag</Table.Head>
							<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">Status</Table.Head>
							<Table.Head class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider">Time</Table.Head>
							<Table.Head class="text-muted-foreground/70 text-right text-[10px] font-bold uppercase tracking-wider">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each submissions as sub (sub.id)}
							<Table.Row class="group border-none transition-colors">
								<Table.Cell class="font-mono text-xs">{sub.id}</Table.Cell>
								{#if !authState.userMode}
									<Table.Cell class="max-w-[120px] truncate">
										{sub.user_name}
									</Table.Cell>
								{/if}
								<Table.Cell class="max-w-[120px] truncate">
									{sub.team_name}
								</Table.Cell>
								<Table.Cell class="font-medium max-w-[120px] truncate">
									{sub.chall_name}
								</Table.Cell>
								<Table.Cell class="max-w-[200px]">
									<div class="flex items-center gap-2">
										<code class="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground truncate w-full {expandedFlags[sub.id] ? 'break-all whitespace-normal' : ''}">
											{sub.flag}
										</code>
										<Button variant="ghost" size="icon" class="h-6 w-6 shrink-0" onclick={() => expandedFlags[sub.id] = !expandedFlags[sub.id]}>
											{#if expandedFlags[sub.id]}
												<EyeOff class="h-3 w-3" />
											{:else}
												<Eye class="h-3 w-3" />
											{/if}
										</Button>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1">
										{#if sub.status === 'Correct'}
											<CheckCircle class="w-4 h-4 text-green-500" />
											<span class="text-xs text-green-500">Correct</span>
										{:else}
											<XCircle class="w-4 h-4 text-destructive" />
											<span class="text-xs text-destructive">Incorrect</span>
										{/if}
										{#if sub.first_blood}
											<Droplet class="w-3 h-3 text-red-500 fill-red-500" />
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-[10px] text-muted-foreground whitespace-nowrap">
									{new Date(sub.timestamp).toLocaleString()}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon"
										class="text-muted-foreground hover:text-destructive transition-colors h-8 w-8"
										onclick={() => remove(sub.id)}
										disabled={deleting[sub.id]}
									>
										{#if deleting[sub.id]}
											<Spinner class="h-3 w-3" />
										{:else}
											<Trash2 class="h-4 w-4" />
										{/if}
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
		
		{#if paginationInfo.pages > 1}
			<div class="mt-4 flex justify-center">
				<Pagination.Root {count} {perPage} bind:page={currentPage} siblingCount={1}>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content>
							<Pagination.Item>
								<Pagination.PrevButton />
							</Pagination.Item>
							{#each pages as page (page.key)}
								{#if page.type === 'ellipsis'}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link {page} isActive={currentPage === page.value}>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}
							<Pagination.Item>
								<Pagination.NextButton />
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		{/if}
	{/if}
</div>
