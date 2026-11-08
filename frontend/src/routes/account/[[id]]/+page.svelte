<script lang="ts">
	import { page } from '$app/stores';
	import { authState, loadUser } from '$lib/stores/auth';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { getTeam } from '$lib/team';
	import { getUserData, updateUser } from '$lib/user';
	import Solvelist from '$lib/components/account/AccountScoreboard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import {
		Mail,
		Users,
		Pencil,
		Medal,
		Calendar
	} from '@lucide/svelte';
	import ErrorMessage from '$lib/components/ui/error-message.svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
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

	let activeTab = $state<'overview' | 'solves' | 'achievements'>('overview');

	// Derive currentUserId from params/user
	const currentUserId = $derived.by(() => {
		if (!authState.ready) return null;

		const routeKey = normalizeKey($page.params.id);
		if (routeKey) return validateId(routeKey);

		// Fallback to own profile
		if (!authState.user) return null;
		const fallbackKey = authState.userMode ? authState.user.team_id : authState.user.id;

		return fallbackKey ? validateId(String(fallbackKey)) : null;
	});

	function normalizeKey(x: unknown): string | null {
		const s = String(x ?? '').trim();
		return s ? s : null;
	}

	function validateId(key: string): number | null {
		if (/^\d+$/.test(key)) {
			const num = Number(key);
			return num > 0 ? num : null;
		}
		return null;
	}

	const userQuery = createQuery(() => ({
		queryKey: ['user', currentUserId, authState.userMode],
		queryFn: () => getUserData(currentUserId!, authState.userMode),
		enabled: currentUserId !== null,
		staleTime: 10_000
	}));

	const userVerboseData = $derived(userQuery.data ?? null);

	// Derive currentTeamId from user data
	const currentTeamId = $derived.by(() => {
		if (authState.userMode || !userVerboseData) return null;
		return userVerboseData?.team_id ?? null;
	});

	const teamQuery = createQuery(() => ({
		queryKey: ['team', currentTeamId],
		queryFn: () => getTeam(currentTeamId!),
		enabled: currentTeamId !== null && !authState.userMode,
		staleTime: 10_000
	}));

	const team = $derived(teamQuery.data ?? null);

	const loading = $derived(
		(currentUserId !== null && !userQuery.isError && (userQuery.isFetching || !userVerboseData)) ||
			(currentTeamId !== null && !teamQuery.isError && (teamQuery.isFetching || !team))
	);
	const teamError = $derived(userQuery.error?.message ?? teamQuery.error?.message ?? null);

	const isOwnProfile = $derived.by(() => {
		if (!authState.user || !userVerboseData) return false;
		if (authState.userMode) {
			return String(authState.user.team_id) === String(userVerboseData.id);
		}
		return String(authState.user.id) === String(userVerboseData.id);
	});

	const solveCount = $derived.by(() => {
		if (authState.userMode) return userVerboseData?.solves?.length ?? 0;
		return (
			team?.solves?.filter((s) => String(s.user_id) === String(userVerboseData?.id)).length ?? 0
		);
	});

	const displayBadges = $derived.by(() => {
		if (authState.userMode && userVerboseData?.badges && userVerboseData.badges.length > 0)
			return userVerboseData.badges;
		if (!authState.userMode && team?.badges && team.badges.length > 0) return team.badges;
		return [];
	});

	const notStarted = $derived.by(() => {
		if (!authState.ready || !authState.startTime) return false;
		return new Date(authState.startTime).getTime() > Date.now();
	});

	const queryClient = useQueryClient();

	let editProfileOpen = $state(false);
	let editName = $state('');
	let editCountryCode = $state('');
	let savingProfile = $state(false);

	function openEditProfile() {
		editName = userVerboseData?.name ?? '';
		editCountryCode = userVerboseData?.country?.toUpperCase?.() ?? '';
		editProfileOpen = true;
	}

	async function handleSaveProfile() {
		if (!authState.user || !editName.trim()) return;
		savingProfile = true;
		try {
			await updateUser(authState.user.id, editName.trim(), editCountryCode.trim());
			await loadUser(true);
			await userQuery.refetch();
			queryClient.invalidateQueries({ queryKey: ['user'] });
			showSuccess('Profile updated successfully.');
			editProfileOpen = false;
		} catch (err: any) {
			showError(err, 'Failed to update profile.');
		} finally {
			savingProfile = false;
		}
	}
</script>

{#if !authState.ready || loading}
	<div class="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 py-8">
		<!-- Skeleton Header -->
		<div class="space-y-4">
			<div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
			<Separator />
			<div class="flex flex-col items-center justify-center py-12">
				<Spinner class="mb-4 h-8 w-8" />
				<p class="text-muted-foreground">Loading profile...</p>
			</div>
		</div>
	</div>
{:else if !authState.user}
	<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
		<Card.Root>
			<Card.Content class="py-10 text-center">
				<p>You're not signed in.</p>
			</Card.Content>
		</Card.Root>
	</div>
{:else if !userVerboseData}
	<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
		<Card.Root>
			<Card.Content class="py-10 text-center">
				<p>Profile not found.</p>
			</Card.Content>
		</Card.Root>
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
							<GeneratedAvatar seed={userVerboseData?.name ?? 'user'} class="h-full w-full" />
						</div>
						{#if userVerboseData?.country}
							{@const country = getCountryByIso3(userVerboseData.country)}
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
						<!-- Team and Role Tags above name -->
						<div class="flex flex-wrap items-center gap-2">
							{#if !authState.userMode && team}
								<a
									href="/team/{team.id}"
									class="bg-primary/10 hover:bg-primary/15 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors"
								>
									<Users class="h-3 w-3" />
									<span>{team.name}</span>
								</a>
							{/if}
							{#if userVerboseData?.role}
								<span
									class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
								>
									{userVerboseData.role}
								</span>
							{/if}
						</div>

						<!-- Player Name + Pencil Button -->
						<div class="flex items-center gap-2">
							<h1 class="truncate text-2xl font-bold sm:text-3xl">
								{userVerboseData?.name ?? 'Unknown User'}
							</h1>
							{#if isOwnProfile}
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
									onclick={openEditProfile}
									aria-label="Edit profile"
								>
									<Pencil class="h-3.5 w-3.5" />
								</Button>
							{/if}
						</div>

						<!-- Country (normal row below player name) -->
						{#if userVerboseData?.country}
							{@const country = getCountryByIso3(userVerboseData.country)}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								{#if country?.iso2}
									<CountryFlag
										country={country.iso2}
										width={16}
										height={16}
										class="rounded-sm object-cover"
									/>
								{/if}
								<span>{country?.label ?? userVerboseData.country}</span>
							</div>
						{/if}

						<!-- Email -->
						{#if userVerboseData?.email}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								<Mail class="h-3.5 w-3.5 shrink-0" />
								<span>{userVerboseData.email}</span>
							</div>
						{/if}

						<!-- Joined below email with icon and day -->
						{#if userVerboseData?.joined_at}
							<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
								<Calendar class="h-3.5 w-3.5 shrink-0" />
								<span>{formatDateTime24h(userVerboseData.joined_at)}</span>
							</div>
						{/if}

						<!-- Change password link -->
						{#if isOwnProfile}
							<div class="pt-1">
								<a
									href="/settings/profile"
									class="text-primary hover:underline text-xs font-medium inline-flex items-center gap-1"
								>
									Change password
								</a>
							</div>
						{/if}
					</div>

					<!-- Key Stats (Right Side on Desktop) -->
					<div
						class="border-border mt-2 flex w-full gap-4 border-t pt-4 sm:mt-0 sm:w-auto sm:gap-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
					>
						<div class="text-center sm:text-right">
							<p class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
								Points
							</p>
							<p class="font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
								{userVerboseData?.score?.toLocaleString() ?? 0}
							</p>
						</div>
						<div class="text-center sm:text-right">
							<p class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
								Solves
							</p>
							<p class="font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
								{solveCount}
							</p>
						</div>
					</div>
				</div>

				{#if displayBadges.length > 0}
					<div class="border-border mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
						<span class="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
							>Badges</span
						>
						<div class="flex flex-wrap gap-2">
							{#each displayBadges as badge}
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
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'overview'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={() => (activeTab = 'overview')}
				>
					Overview
				</button>
				<button
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'solves'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={() => (activeTab = 'solves')}
				>
					Solves
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'overview'}
			<div class="grid gap-4 lg:grid-cols-7">
				<!-- Radar Chart (Left, 3 cols, or full if not started) -->
				<Card.Root class="bg-card flex flex-col items-center justify-center border-0 shadow-sm {notStarted ? 'lg:col-span-7' : 'lg:col-span-3'}">
					<Card.Content class="w-full pt-6">
						<RadarChart 
							solves={userVerboseData?.solves} 
							totalChallenges={userVerboseData?.total_category_challenges} 
						/>
					</Card.Content>
				</Card.Root>

				{#if !notStarted}
					<!-- Stats and Breakdown Section (Right, 4 cols) -->
					<div class="flex flex-col gap-4 lg:col-span-4">
						<!-- Category Breakdown -->
						<Card.Root class="bg-card flex-1 border-0 shadow-sm">
							<Card.Header class="pb-2">
								<Card.Title class="text-muted-foreground text-sm font-medium uppercase tracking-wider"
									>Category Breakdown</Card.Title
								>
							</Card.Header>
							<Card.Content>
								{#if userVerboseData?.total_category_challenges && userVerboseData.total_category_challenges.length > 0}
									{@const categories = (() => {
										const solveCounts: Record<string, number> = {};
										for (const s of userVerboseData.solves || []) {
											if (s.category) solveCounts[s.category] = (solveCounts[s.category] || 0) + 1;
										}
										return userVerboseData.total_category_challenges
											.map((tc) => ({
												cat: tc.category,
												count: solveCounts[tc.category] || 0,
												total: tc.count || 1,
												pct: Math.round(((solveCounts[tc.category] || 0) / (tc.count || 1)) * 100)
											}))
											.sort((a, b) => b.pct - a.pct || b.count - a.count);
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
			</div>
		{:else if activeTab === 'solves'}
			<Card.Root class="overflow-hidden border-0 shadow-sm">
				<Card.Content class="p-0">
					{#if authState.userMode}
						<Solvelist
							solves={Array.isArray(userVerboseData?.solves) ? userVerboseData.solves : []}
						/>
					{:else if teamError}
						<ErrorMessage title="Error loading team data" message={teamError} />
					{:else if !team}
						<div class="text-muted-foreground p-8 text-center">
							This user has not joined a team yet.
						</div>
					{:else}
						<Solvelist
							solves={Array.isArray(team?.solves)
								? team.solves.filter((s: any) => String(s.user_id) === String(userVerboseData?.id))
								: []}
						/>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	{#if isOwnProfile}
		<Dialog.Root bind:open={editProfileOpen}>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title>Edit profile</Dialog.Title>
					<Dialog.Description>
						Update your public display name and nationality.
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4 py-4">
					<div class="space-y-2">
						<Label for="edit-name">Display name</Label>
						<Input
							id="edit-name"
							bind:value={editName}
							placeholder="Enter your display name"
						/>
					</div>
					<div class="space-y-2">
						<Label for="edit-country">Nationality</Label>
						<CountrySelect id="edit-country" bind:value={editCountryCode} />
					</div>
				</div>
				<Dialog.Footer>
					<Button variant="ghost" onclick={() => (editProfileOpen = false)}>Cancel</Button>
					<Button
						onclick={handleSaveProfile}
						disabled={savingProfile || !editName.trim()}
					>
						{#if savingProfile}
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


