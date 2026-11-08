<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { resetTeamPassword, getTeamInviteToken } from '$lib/team';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Card from '$lib/components/ui/card';
	import { ShieldHalf, Link as LinkIcon, Users, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { copyToClipboard } from '$lib/utils/clipboard';

	let user = $derived(authState.user);

	let newPassword = $state('');
	let confirmPassword = $state('');
	let resettingPassword = $state(false);

	let inviteLoading = $state(false);
	let inviteCopied = $state(false);

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
			const url = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
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
		<h2 class="text-2xl font-bold tracking-tight">Team settings</h2>
		<p class="text-muted-foreground">Manage recruitment and update your team password.</p>
	</div>

	{#if !user?.team_id}
		<Card.Root class="border-destructive/20 bg-destructive/5 shadow-none">
			<Card.Content class="pt-6">
				<div class="text-destructive flex items-center gap-4">
					<ShieldHalf class="h-8 w-8" />
					<div>
						<p class="font-bold">Team access restricted</p>
						<p class="text-sm">
							You are not currently belonging to a team. You can create or join one from the
							competition dashboard.
						</p>
					</div>
				</div>
				<div class="mt-4">
					<Button href="/team" variant="outline" size="sm">Go to team dashboard</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
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
								<p class="text-sm font-bold">Invite members</p>
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
								Copy invite link
							{/if}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Security Card -->
		<form onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
			<Card.Root>
				<Card.Header>
					<Card.Title>Security</Card.Title>
					<Card.Description>Update the team password</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="new-token">New team password</Label>
							<Input id="new-token" type="password" bind:value={newPassword} placeholder="••••••••" />
						</div>
						<div class="space-y-2">
							<Label for="confirm-token">Confirm new password</Label>
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
						type="submit"
						variant="outline"
						disabled={resettingPassword || !newPassword}
					>
						{#if resettingPassword}Updating...{:else}Update team password{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</form>
	{/if}
</div>
