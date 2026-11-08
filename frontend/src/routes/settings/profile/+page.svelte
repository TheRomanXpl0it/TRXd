<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { resetUserPassword } from '$lib/user';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Card from '$lib/components/ui/card';

	let user = $derived(authState.user);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let resettingPassword = $state(false);

	async function handleChangePassword() {
		if (!user || !newPassword) return;
		if (newPassword !== confirmPassword) {
			showError(null, 'Passwords do not match.');
			return;
		}

		resettingPassword = true;
		try {
			await resetUserPassword(user.id, newPassword.trim());
			showSuccess('Password updated successfully.');
			newPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			showError(err, 'Failed to update password.');
		} finally {
			resettingPassword = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">Security</h2>
		<p class="text-muted-foreground">Change your password to keep your account secure.</p>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
		<Card.Root>
			<Card.Header>
				<Card.Title>Change password</Card.Title>
				<Card.Description>Enter and confirm your new password below.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="new-password">New password</Label>
						<Input
							id="new-password"
							type="password"
							bind:value={newPassword}
							placeholder="••••••••"
						/>
					</div>
					<div class="space-y-2">
						<Label for="confirm-password">Confirm password</Label>
						<Input
							id="confirm-password"
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
					{#if resettingPassword}Updating...{:else}Change password{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>
