<script lang="ts">
	import { authState, loadUser } from '$lib/stores/auth';
	import { updateTeam, resetTeamPassword, getTeam, getTeamInviteToken } from '$lib/team';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { getCountryByIso3 } from '$lib/utils/countries';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import CountryFlag from '$lib/components/ui/country-flag.svelte';
	import CountrySelect from '$lib/components/ui/country-select.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Card from '$lib/components/ui/card';
	import { ShieldHalf, Lock, Globe, Link as LinkIcon, Users, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { createQuery } from '@tanstack/svelte-query';
	import { copyToClipboard } from '$lib/utils/clipboard';

	let user = $derived(authState.user);

	const teamQuery = createQuery(() => ({
		queryKey: ['team', user?.team_id],
		queryFn: () => getTeam(user!.team_id!),
		enabled: !!user?.team_id
	}));

	let teamData = $derived(teamQuery.data);

	let name = $state('');
	let countryCode = $state('');

	$effect(() => {
		if (teamData) {
			name = teamData.name ?? '';
			countryCode = teamData.country?.toUpperCase() ?? '';
		}
	});

	let saving = $state(false);

	let newPassword = $state('');
	let confirmPassword = $state('');
	let resettingPassword = $state(false);

	let inviteLoading = $state(false);
	let inviteCopied = $state(false);

	async function handleSaveTeam() {
		if (!user?.team_id) return;
		saving = true;
		try {
			await updateTeam(user.team_id, name, countryCode.trim());
			await loadUser(true);
			teamQuery.refetch();
			showSuccess('Team profile updated successfully.');
		} catch (err: any) {
			showError(err, 'Failed to update team.');
		} finally {
			saving = false;
		}
	}

	async function handleChangePassword() {
		if (!user?.team_id || !newPassword) return;
		if (newPassword !== confirmPassword) {
			showError(null, 'Passwords do not match.');
			return;
		}

		resettingPassword = true;
		try {
			await resetTeamPassword(user.team_id, newPassword.trim());
			showSuccess('Team password updated.');
			newPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			showError(err, 'Failed to update team password.');
		} finally {
			resettingPassword = false;
		}
	}

	async function copyInviteLink() {
		inviteLoading = true;
		try {
			const { token } = await getTeamInviteToken();
			const url = `${window.location.origin}/join?token=${token}`;
			await copyToClipboard(url);
			inviteCopied = true;
			toast.success('Invite link copied to clipboard!');
			setTimeout(() => (inviteCopied = false), 2000);
		} catch (err: any) {
			showError(err, 'Failed to generate invite link');
		} finally {
			inviteLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">Team Settings</h2>
		<p class="text-muted-foreground">Manage your team's profile and security.</p>
	</div>

	{#if !user?.team_id}
		<Card.Root class="border-destructive/20 bg-destructive/5 shadow-none">
			<Card.Content class="pt-6">
				<div class="text-destructive flex items-center gap-4">
					<ShieldHalf class="h-8 w-8" />
					<div>
						<p class="font-bold">Team Access Restricted</p>
						<p class="text-sm">
							You are not currently belonging to a team. You can create or join one from the
							competition dashboard.
						</p>
					</div>
				</div>
				<div class="mt-4">
					<Button href="/team" variant="outline" size="sm">Go to Team Dashboard</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Main Profile Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Team Identity</Card.Title>
				<Card.Description>Update your team's public name and origin.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex items-center gap-6">
					<div
						class="border-muted bg-muted/30 relative h-24 w-24 overflow-hidden rounded-full border-4"
					>
						<GeneratedAvatar seed={name || 'team'} class="h-full w-full" />
					</div>
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<h3 class="text-xl font-bold">
								{name || (authState.userMode ? user?.name : 'Team Name')}
							</h3>
							<span
								class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
								>Active Team</span
							>
						</div>
						<div class="text-muted-foreground flex items-center gap-2 text-sm">
							{#if countryCode}
								{@const country = getCountryByIso3(countryCode)}
								{#if country?.iso2}
									<CountryFlag country={country.iso2} width={16} height={16} />
								{/if}
								<span>{countryCode}</span>
							{:else}
								<span>No country set</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="team-name">Team Name</Label>
						<Input id="team-name" bind:value={name} placeholder="Enter team name" />
					</div>
					<div class="space-y-2">
						<Label for="team-country">Country / Region</Label>
						<CountrySelect id="team-country" bind:value={countryCode} />
					</div>
				</div>
			</Card.Content>
			<Card.Footer>
				<Button onclick={handleSaveTeam} disabled={saving}>
					{#if saving}Applying...{:else}Apply{/if}
				</Button>
			</Card.Footer>
		</Card.Root>

		<!-- Invitation Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Recruitment</Card.Title>
				<Card.Description>Invite new members to join your team.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-4">
					<div
						class="bg-muted/50 flex items-center justify-between gap-4 rounded-lg border border-dashed p-4"
					>
						<div class="flex items-center gap-3">
							<div class="bg-primary/10 text-primary rounded-lg p-2">
								<Users class="h-5 w-5" />
							</div>
							<div>
								<p class="text-sm font-bold">Invite Members</p>
							</div>
						</div>
						<Button
							size="sm"
							variant={inviteCopied ? 'default' : 'outline'}
							onclick={copyInviteLink}
							disabled={inviteLoading}
							class="min-w-[140px] gap-2"
						>
							{#if inviteCopied}
								<Check class="h-4 w-4" />
								Copied!
							{:else}
								<LinkIcon class="h-4 w-4" />
								Copy Invite Link
							{/if}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Security Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Security</Card.Title>
				<Card.Description>Update the team password</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="new-token">New Team Password</Label>
						<Input id="new-token" type="password" bind:value={newPassword} placeholder="••••••••" />
					</div>
					<div class="space-y-2">
						<Label for="confirm-token">Confirm New Password</Label>
						<Input
							id="confirm-token"
							type="password"
							bind:value={confirmPassword}
							placeholder="••••••••"
						/>
					</div>
				</div>
			</Card.Content>
			<Card.Footer>
				<Button
					variant="outline"
					onclick={handleChangePassword}
					disabled={resettingPassword || !newPassword}
				>
					{#if resettingPassword}Updating...{:else}Update Team Password{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
