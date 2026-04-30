<script lang="ts">
	import { getInstances, adminStopInstance } from '$lib/instances';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, ServerIcon, RefreshCw } from '@lucide/svelte';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table';
	import { formatConnectionString } from '$lib/utils/connection';

	let instances = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let stopping = $state<Record<string, boolean>>({});
	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	function timeUntil(dateStr: string): string {
		const diff = Math.round((new Date(dateStr).getTime() - now) / 1000);
		if (diff <= 0) return 'Expired';
		if (diff < 60) return `in ${diff}s`;
		if (diff < 3600) return `in ${Math.round(diff / 60)}m`;
		return `in ${Math.round(diff / 3600)}h`;
	}

	const isAdmin = $derived(authState.user?.role === 'Admin');

	async function loadInstances() {
		if (!isAdmin) return;
		loading = true;
		error = null;
		try {
			instances = await getInstances();
		} catch (err: any) {
			error = err?.message ?? 'Failed to load instances';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadInstances();
	});

	async function stop(teamId: number, challId: number) {
		if (!confirm('Are you sure you want to stop this instance?')) return;
		const key = `${teamId}-${challId}`;
		if (stopping[key]) return;

		stopping[key] = true;
		try {
			await adminStopInstance(teamId, challId);
			showSuccess('Instance stopped successfully.');
			loadInstances(); // Refresh the list
		} catch (err: any) {
			showError(err, 'Failed to stop instance.');
		} finally {
			stopping[key] = false;
		}
	}

	function formatConn(inst: any) {
		return formatConnectionString({
			host: inst.host,
			port: inst.port,
			connType: inst.conn_type,
			sslWithoutPort: true
		});
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Instances</h1>
			<p class="text-muted-foreground mt-1">Manage active challenge containers</p>
		</div>
		<Button variant="outline" size="sm" onclick={loadInstances} disabled={loading}>
			<RefreshCw class="mr-2 h-4 w-4 {loading ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	{#if loading && instances.length === 0}
		<div class="flex flex-col items-center justify-center py-12">
			<Spinner class="mb-4 h-8 w-8" />
			<p class="text-muted-foreground">Loading instances...</p>
		</div>
	{:else if error && instances.length === 0}
		<div class="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4">
			<p class="font-semibold">Error loading instances</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if instances.length === 0}
		<Card.Root class="text-muted-foreground p-8 text-center">No active instances found.</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="border-none hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Team (ID)</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Challenge (ID)</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Docker ID</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Connection</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-wider"
									>Expires</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 text-right text-[10px] font-bold uppercase tracking-wider"
									>Actions</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each instances as inst (`${inst.team_id}-${inst.chall_id}`)}
								<Table.Row class="group border-none transition-colors">
									<Table.Cell class="font-medium">
										{inst.team_name}
										<span class="text-muted-foreground text-xs">({inst.team_id})</span>
									</Table.Cell>
									<Table.Cell>
										{inst.chall_name}
										<span class="text-muted-foreground text-xs">({inst.chall_id})</span>
									</Table.Cell>
									<Table.Cell class="max-w-[180px] truncate" title={inst.docker_id || ''}>
										<code class="bg-muted rounded px-1.5 py-0.5 text-xs"
											>{inst.docker_id || '-'}</code
										>
									</Table.Cell>
									<Table.Cell>
										<code class="bg-muted rounded px-1.5 py-0.5 text-xs">{formatConn(inst)}</code>
									</Table.Cell>
									<Table.Cell class="font-mono text-xs">
										{#if inst.expires_at}
											<span
												class={timeUntil(inst.expires_at) === 'Expired'
													? 'text-destructive'
													: 'text-foreground'}
											>
												{timeUntil(inst.expires_at)}
											</span>
										{:else}
											<span class="text-muted-foreground">Never</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive h-8 w-8 transition-colors"
											onclick={() => stop(inst.team_id, inst.chall_id)}
											disabled={stopping[`${inst.team_id}-${inst.chall_id}`]}
										>
											{#if stopping[`${inst.team_id}-${inst.chall_id}`]}
												<Spinner class="h-4 w-4" />
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
	{/if}
</div>
