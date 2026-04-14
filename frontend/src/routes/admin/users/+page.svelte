<script lang="ts">
	import { resetUserPassword, getUserByEmail, getUserByName } from '$lib/user';
	import { Button } from '$lib/components/ui/button';
	import { authState } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Search, KeyRound, User as UserIcon, ExternalLink, ShieldAlert } from '@lucide/svelte';
	import { showSuccess, showError } from '$lib/utils/toast';
	import * as Dialog from '$lib/components/ui/dialog';

	let query = $state('');
	let searchType = $state<'name' | 'email'>('name');
	let loading = $state(false);
	let results = $state<any[]>([]);
	let searched = $state(false);

	let selectedUser = $state<any>(null);
	let newPassword = $state('');
	let showResetDialog = $state(false);
	let resetting = $state(false);

	const userMode = $derived(authState.userMode);
	const lookupSubject = $derived(userMode ? 'team name' : 'name');
	const pageDescription = $derived(
		userMode ? 'Search users through their team records and manage account security' : 'Search users and manage account security'
	);
	const searchDescription = $derived(
		userMode
			? 'Look up a user by the exact team name or by the linked email address'
			: 'Look up a user by their exact name or email address'
	);
	const namePlaceholder = $derived(
		userMode ? 'Exact team name (e.g. team rocket)' : 'Exact username (e.g. alice)'
	);
	const identityHeader = $derived(userMode ? 'Team / Email' : 'Name / Username');
	const emptyStateLabel = $derived(userMode ? 'team-backed user' : 'user');
	const resetTargetId = $derived(
		selectedUser ? (userMode ? selectedUser.user_id ?? null : selectedUser.id) : null
	);

	$effect(() => {
		if (!authState.ready) return;
		if (authState.user?.role !== 'Admin') {
			goto('/admin');
		}
	});

	// Debounced auto-search: fires 400ms after the user stops typing
	$effect(() => {
		const q = query; // track reactively
		if (!q.trim()) {
			results = [];
			searched = false;
			return;
		}
		const timer = setTimeout(() => search(), 400);
		return () => clearTimeout(timer);
	});

	async function search() {
		if (!query.trim()) return;
		loading = true;
		results = [];
		searched = true;
		try {
			const q = query.trim();
			let user: any = null;
			if (searchType === 'email') {
				user = await getUserByEmail(q);
			} else {
				user = await getUserByName(q);
			}
			results = user ? [user] : [];
		} catch (err: any) {
			const msg: string = err?.message?.toLowerCase() ?? '';
			const isNotFound =
				msg.includes('not found') || msg.includes('invalid') || msg.includes('404');
			if (!isNotFound) showError(err, 'Failed to search users');
			results = [];
		} finally {
			loading = false;
		}
	}

	function openReset(user: any) {
		selectedUser = user;
		newPassword = '';
		showResetDialog = true;
	}

	async function handleReset() {
		if (!selectedUser || !newPassword.trim() || resetTargetId === null) return;

		if (!confirm(`Are you sure you want to change the password for ${selectedUser.name}?`)) return;

		resetting = true;
		try {
			await resetUserPassword(resetTargetId, newPassword);
			showSuccess(`Password for ${selectedUser.name} updated.`);
			showResetDialog = false;
		} catch (err: any) {
			showError(err, 'Failed to reset password');
		} finally {
			resetting = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">User Management</h1>
		<p class="text-muted-foreground mt-1">{pageDescription}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Search Users</Card.Title>
			<Card.Description>{searchDescription}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-center"
				onsubmit={(e) => {
					e.preventDefault();
					search();
				}}
			>
				<!-- Type selector -->
				<div
					class="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-lg p-1"
				>
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all {searchType ===
						'name'
							? 'bg-background text-foreground shadow-sm'
							: 'hover:bg-background/50 hover:text-foreground'}"
						onclick={() => {
							searchType = 'name';
							query = '';
							results = [];
							searched = false;
						}}
					>
						{userMode ? 'Team' : 'Name'}
					</button>
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all {searchType ===
						'email'
							? 'bg-background text-foreground shadow-sm'
							: 'hover:bg-background/50 hover:text-foreground'}"
						onclick={() => {
							searchType = 'email';
							query = '';
							results = [];
							searched = false;
						}}
					>
						Email
					</button>
				</div>
				<!-- Query input -->
				<div class="relative flex-1">
					{#if loading}
						<Spinner class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					{:else}
						<Search
							class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
						/>
					{/if}
					<Input
						bind:value={query}
						placeholder={searchType === 'name'
							? namePlaceholder
							: 'Email address (e.g. alice@ctf.io)'}
						class="pl-9"
					/>
				</div>
				<Button type="submit" disabled={loading} class="shrink-0">Search</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if results.length > 0}
		<Card.Root class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="border-none hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 w-[80px] bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>ID</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>{identityHeader}</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>Role</Table.Head
								>
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-right text-[10px] font-bold uppercase tracking-wider"
									>Actions</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each results as user (user.id)}
								<Table.Row class="hover:bg-muted/50 group border-none transition-colors">
									<Table.Cell class="font-mono text-xs">{user.id}</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col">
											<span class="text-sm font-medium">{user.name}</span>
											{#if userMode}
												<span class="text-muted-foreground text-xs">
													{user.email || 'No email set'}
												</span>
											{:else}
												<span class="text-muted-foreground text-xs"
													>@{user.username || user.name}</span
												>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<span
											class="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
										>
											{user.role || 'User'}
										</span>
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex items-center justify-end gap-1">
											<a
												href="/account/{user.id}"
												target="_blank"
												rel="noopener noreferrer"
												class="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
											>
												<ExternalLink class="h-3.5 w-3.5" />
												Profile
											</a>
											{#if !userMode || user.user_id}
												<Button
													variant="ghost"
													size="sm"
													class="text-muted-foreground hover:text-foreground h-8 gap-2 transition-colors"
													onclick={() => openReset(user)}
												>
													<KeyRound class="h-3.5 w-3.5" />
													Reset
												</Button>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if searched && query && !loading}
		<div
			class="bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
		>
			<UserIcon class="text-muted-foreground mb-2 h-10 w-10 opacity-20" />
			<p class="text-muted-foreground text-sm">
				No {emptyStateLabel} found with {searchType === 'name' ? lookupSubject : 'email'} <span class="text-foreground font-medium"
					>"{query}"</span
				>
			</p>
		</div>
	{/if}
</div>

<!-- Password Reset Dialog -->
<Dialog.Root bind:open={showResetDialog}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<ShieldAlert class="text-destructive h-5 w-5" />
				Change Password
			</Dialog.Title>
			<Dialog.Description>
				Updating password for <span class="text-foreground font-bold">{selectedUser?.name}</span>.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="space-y-2">
				<Label for="new-password">New Password</Label>
				<Input id="new-password" type="password" bind:value={newPassword} placeholder="••••••••" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (showResetDialog = false)}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={handleReset}
				disabled={resetting || !newPassword.trim() || resetTargetId === null}
			>
				{#if resetting}
					<Spinner class="mr-2 h-4 w-4" />
				{/if}
				Update Password
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
