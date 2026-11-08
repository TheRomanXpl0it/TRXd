<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { Users, Pencil, LayoutGrid, List, Mail, Medal, Calendar } from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	import SolveListTable from '$lib/components/team/TeamScoreboard.svelte';
	import TeamJoinCreate from '$lib/components/team/TeamJoinCreate.svelte';
	import { getTeam, updateTeam } from '$lib/team';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import CountrySelect from '$lib/components/ui/country-select.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import RadarChart from '$lib/components/RadarChart.svelte';
	import CountryFlag from '$lib/components/ui/country-flag.svelte';
	import { getCountryByIso3 } from '$lib/utils/countries';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { formatDateTime24h } from '$lib/utils/formatting';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { authState, loadUser } from '$lib/stores/auth';

	let activeTab = $state<'overview' | 'solves'>('overview');

	const currentTeamId = $derived.by(() => {
		if (!authState.ready) return null;
		const routeKey = normalizeKey($page.params.id);
		const fallbackKey = normalizeKey(authState.user?.team_id);
		const effectiveKey = routeKey ?? fallbackKey;
		return effectiveKey ? validateId(effectiveKey) : null;
	});

	const teamQuery = createQuery(() => ({
		queryKey: ['team', currentTeamId],
		queryFn: () => getTeam(currentTeamId!),
		enabled: currentTeamId !== null,
		staleTime: 10_000
	}));

	const team = $derived(teamQuery.data ?? null);
	const loading = $derived(teamQuery.isLoading && currentTeamId !== null);
	const teamError = $derived(teamQuery.error?.message ?? null);

	const isOwnTeam = $derived(
		authState.user && team && String(authState.user.team_id) === String(team.id)
	);

	function normalizeKey(x: unknown): string | null {
		const s = String(x ?? '').trim();
		return s ? s : null;
	}

	function validateId(key: string): number | null {
		// Only allow positive integers
		if (/^\d+$/.test(key)) {
			const num = Number(key);
			return num > 0 ? num : null;
		}
		return null;
	}

	const notStarted = $derived.by(() => {
		if (!authState.ready || !authState.startTime) return false;
		return new Date(authState.startTime).getTime() > Date.now();
	});

	const queryClient = useQueryClient();

	let editTeamOpen = $state(false);
	let editTeamName = $state('');
	let editTeamCountry = $state('');
	let savingTeam = $state(false);

	function openEditTeam() {
		editTeamName = team?.name ?? '';
		editTeamCountry = team?.country?.toUpperCase() ?? '';
		editTeamOpen = true;
	}

	async function handleSaveTeam() {
		if (!team || !editTeamName.trim()) return;
		savingTeam = true;
		try {
			await updateTeam(team.id, editTeamName.trim(), editTeamCountry.trim());
			await loadUser(true);
			await teamQuery.refetch();
			queryClient.invalidateQueries({ queryKey: ['team'] });
			showSuccess('Team updated successfully.');
			editTeamOpen = false;
		} catch (err: any) {
			showError(err, 'Failed to update team.');
		} finally {
			savingTeam = false;
		}
	}
</script>

{#if !authState.ready || loading}
	<div class="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 py-8">
		<div class="space-y-4">
			<div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
			<Separator />
			<div class="flex flex-col items-center justify-center py-12">
				<Spinner class="mb-4 h-8 w-8" />
				<p class="text-muted-foreground">Loading team...</p>
			</div>
		</div>
	</div>
{:else if teamError}
	<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
		<div
			class="border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive dark:bg-destructive/20 rounded-lg border p-6"
		>
			<p class="text-lg font-semibold">Error loading team</p>
			<p>{teamError}</p>
		</div>
	</div>
{:else if !team}
	<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
		<TeamJoinCreate />
	</div>
{:else}
	<div class="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 py-8">
		<!-- Hero Card -->
		<Card.Root
			class="from-muted/20 to-background overflow-hidden border-0 bg-gradient-to-br shadow-sm"
		>
			<Card.Content class="p-5 sm:p-6">
				<div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
					<!-- Avatar with Country Badge -->
					<div class="relative h-20 w-20 shrink-0">
						<div
							class="border-background bg-background h-full w-full overflow-hidden rounded-full border-4 shadow-md"
						>
							<GeneratedAvatar seed={team.name} class="h-full w-full" />
						</div>
						{#if team.country}
							{@const country = getCountryByIso3(team.country)}
							{#if country?.iso2}
								<div
									class="absolute -bottom-1 -right-1 h-7 w-7 overflow-hidden rounded-full border-2 border-white shadow-md dark:border-gray-800"
								>
									<CountryFlag
										country={country.iso2}
										width={28}
										height={28}
										class="h-full w-full object-cover"
									/>
								</div>
							{/if}
						{/if}
					</div>

					<div class="min-w-0 flex-1 space-y-1.5">
						<!-- Role Tag above name -->
						{#if team.role && team.role !== 'User'}
							<div>
								<span
									class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
								>
									{team.role}
								</span>
							</div>
						{/if}

						<!-- Team Name + Pencil Button -->
						<div class="flex items-center gap-2">
							<h1 class="truncate text-2xl font-bold sm:text-3xl tracking-tight">{team.name}</h1>
							{#if isOwnTeam}
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
									onclick={openEditTeam}
									aria-label="Edit team profile"
								>
									<Pencil class="h-3.5 w-3.5" />
								</Button>
							{/if}
						</div>

						<!-- Country (normal row below team name) -->
						{#if team.country}
							{@const country = getCountryByIso3(team.country)}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								{#if country?.iso2}
									<CountryFlag
										country={country.iso2}
										width={16}
										height={16}
										class="rounded-sm object-cover"
									/>
								{/if}
								<span>{country?.label ?? team.country}</span>
							</div>
						{/if}

						<!-- Email -->
						{#if team.email}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								<Mail class="h-3.5 w-3.5 shrink-0" />
								<span>{team.email}</span>
							</div>
						{/if}

						<!-- Members Count -->
						<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
							<Users class="h-3.5 w-3.5 shrink-0" />
							<span>{team.members?.length ?? 0} {team.members?.length === 1 ? 'member' : 'members'}</span>
						</div>

						<!-- Joined / Created Date with icon and day -->
						{#if team.joined_at || team.created_at}
							{@const teamDate = team.joined_at ?? team.created_at ?? ''}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								<Calendar class="h-3.5 w-3.5 shrink-0" />
								<span>{formatDateTime24h(teamDate)}</span>
							</div>
						{/if}

						<!-- Settings link -->
						{#if isOwnTeam}
							<div class="pt-1">
								<a
									href="/settings/team"
									class="text-primary hover:underline text-xs font-medium inline-flex items-center gap-1"
								>
									Settings
								</a>
							</div>
						{/if}
					</div>

					<!-- Key Stats -->
					<div
						class="border-border mt-2 flex w-full justify-between gap-8 border-t pt-4 sm:mt-0 sm:w-auto sm:justify-end sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
					>
						<div class="text-center sm:text-right">
							<p class="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
								Total Score
							</p>
							<p class="font-mono text-3xl font-bold tabular-nums tracking-tight">
								{team.score?.toLocaleString() ?? 0}
							</p>
						</div>
						<div class="text-center sm:text-right">
							<p class="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
								Solves
							</p>
							<p class="font-mono text-3xl font-bold tabular-nums tracking-tight">
								{team.solves?.length ?? 0}
							</p>
						</div>
					</div>
				</div>

				{#if Array.isArray(team.badges) && team.badges.length > 0}
					<div class="border-border mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
						<span class="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
							>Badges</span
						>
						<div class="flex flex-wrap gap-2">
							{#each team.badges as badge}
								<Tooltip.Root>
									<Tooltip.Trigger>
										<span
											class="bg-primary/10 text-primary inline-flex cursor-help items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
										>
											<Medal class="mr-1 h-3 w-3" />
											{badge.name}
										</span>
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>{badge.description}</p>
									</Tooltip.Content>
								</Tooltip.Root>
							{/each}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Tabs Control -->
		<div class="flex justify-center">
			<div
				class="bg-muted text-muted-foreground inline-flex h-10 items-center justify-center gap-1 rounded-lg p-1"
			>
				<button
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'overview'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={() => (activeTab = 'overview')}
				>
					<LayoutGrid class="h-4 w-4" />
					Overview
				</button>
				<button
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'solves'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={() => (activeTab = 'solves')}
				>
					<List class="h-4 w-4" />
					Solves
				</button>
			</div>
		</div>

		{#if activeTab === 'overview'}
			<div class="grid gap-4 lg:grid-cols-7">
				<!-- Radar Chart (Left, 3 cols, or full if not started) -->
				<Card.Root class="bg-card flex flex-col items-center justify-center border-0 shadow-sm {notStarted ? 'lg:col-span-7' : 'lg:col-span-3'}">
					<Card.Content class="w-full pt-6">
						<RadarChart 
							solves={team.solves} 
							totalChallenges={team.total_category_challenges} 
						/>
					</Card.Content>
				</Card.Root>

				{#if !notStarted}
					<!-- Stats Section (Right, 4 cols) -->
					<div class="flex flex-col gap-4 lg:col-span-4">
						<!-- Category Breakdown -->
						<Card.Root class="bg-card flex-1 border-0 shadow-sm">
							<Card.Header class="pb-2">
								<Card.Title class="text-muted-foreground text-sm font-medium uppercase tracking-wider"
									>Category Breakdown</Card.Title
								>
							</Card.Header>
							<Card.Content>
								{#if team?.total_category_challenges && team.total_category_challenges.length > 0}
									{@const categories = (() => {
										const solveCounts: Record<string, number> = {};
										for (const s of team.solves || []) {
											if (s.category) solveCounts[s.category] = (solveCounts[s.category] || 0) + 1;
										}
										return team.total_category_challenges
											.map((tc: any) => ({
												cat: tc.category,
												count: solveCounts[tc.category] || 0,
												total: tc.count || 1,
												pct: Math.round(((solveCounts[tc.category] || 0) / (tc.count || 1)) * 100)
											}))
											.sort((a: any, b: any) => b.pct - a.pct || b.count - a.count);
									})()}
									<div class="grid gap-4 sm:grid-cols-2">
										{#each categories as c}
											<div class="space-y-1">
												<div class="flex justify-between text-xs font-semibold">
													<span class="text-foreground/90">{c.cat}</span>
													<span class={c.pct === 100 ? "text-primary font-bold" : "text-muted-foreground"}>
														{c.count} / {c.total} ({c.pct}%)
													</span>
												</div>
												<div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
													<div class="bg-primary h-full transition-all duration-500" style="width: {c.pct}%"></div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-muted-foreground text-sm">No solves yet.</p>
								{/if}
							</Card.Content>
						</Card.Root>

					</div>
				{/if}

				<!-- Row 2: Members (Full Width) -->
				<Card.Root class="bg-card border-0 shadow-sm lg:col-span-7">
					<Card.Header class="pb-2">
						<Card.Title class="text-muted-foreground text-sm font-medium uppercase tracking-wider"
							>Team Members</Card.Title
						>
					</Card.Header>
					<Card.Content>
						{#if team.members && team.members.length > 0}
							<div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								{#each team.members as member}
									<a
										href={`/account/${member.id}`}
										class="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
									>
										<GeneratedAvatar seed={member.name} size={40} />
										<div class="min-w-0">
											<div class="truncate text-sm font-medium">{member.name}</div>
											<div class="text-muted-foreground text-xs">{member.role}</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground text-sm">No members found.</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		{:else if activeTab === 'solves'}
			<Card.Root class="overflow-hidden border-0 shadow-sm">
				<Card.Content class="p-0">
					<SolveListTable {team} />
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	{#if isOwnTeam}
		<Dialog.Root bind:open={editTeamOpen}>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title>Edit team profile</Dialog.Title>
					<Dialog.Description>
						Update your team's display name and nationality.
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4 py-4">
					<div class="space-y-2">
						<Label for="edit-team-name">Team name</Label>
						<Input
							id="edit-team-name"
							bind:value={editTeamName}
							placeholder="Enter team name"
						/>
					</div>
					<div class="space-y-2">
						<Label for="edit-team-country">Nationality</Label>
						<CountrySelect id="edit-team-country" bind:value={editTeamCountry} />
					</div>
				</div>
				<Dialog.Footer>
					<Button variant="ghost" onclick={() => (editTeamOpen = false)}>Cancel</Button>
					<Button
						onclick={handleSaveTeam}
						disabled={savingTeam || !editTeamName.trim()}
					>
						{#if savingTeam}
							<Spinner class="mr-2 h-4 w-4" />
							Saving...
						{:else}
							Save changes
						{/if}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}

