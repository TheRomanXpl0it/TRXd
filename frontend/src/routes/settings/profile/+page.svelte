<script lang="ts">
	import { authState, loadUser } from '$lib/stores/auth';
	import { updateUser, resetUserPassword } from '$lib/user';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { getCountryByIso3 } from '$lib/utils/countries';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import CountryFlag from '$lib/components/ui/country-flag.svelte';
	import CountrySelect from '$lib/components/ui/country-select.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { onMount } from 'svelte';

	let user = $derived(authState.user);
	let name = $state('');
	let countryCode = $state('');
	let savingProfile = $state(false);

	let currentPasswordField = $state(''); // If needed by backend, though resetUserPassword takes newPassword
	let newPassword = $state('');
	let confirmPassword = $state('');
	let resettingPassword = $state(false);

	import { untrack } from 'svelte';

	$effect(() => {
		if (user) {
			untrack(() => {
				name = user.name ?? '';
				countryCode = user.country?.toUpperCase?.() ?? '';
			});
		}
	});

	async function handleSaveProfile() {
		if (!user) return;
		savingProfile = true;
		try {
			await updateUser(user.id, name.trim(), countryCode.trim());
			await loadUser(true);
			showSuccess('Profile updated successfully.');
		} catch (err: any) {
			showError(err, 'Failed to update profile.');
		} finally {
			savingProfile = false;
		}
	}

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
		<h2 class="text-2xl font-bold tracking-tight">Profile</h2>
		<p class="text-muted-foreground">Manage your public profile information.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Public Info</Card.Title>
			<Card.Description>This information will be visible to other players.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="flex items-center gap-6">
				<div class="border-muted relative h-24 w-24 overflow-hidden rounded-full border-4">
					{#if user?.image}
						<img src={user.image} alt={name} class="h-full w-full object-cover" />
					{:else}
						<GeneratedAvatar seed={name || 'user'} class="h-full w-full" />
					{/if}
				</div>
				<div class="space-y-1">
					<h3 class="text-lg font-medium">{name || 'Your Name'}</h3>
					<div class="text-muted-foreground flex items-center gap-2 text-sm">
						{#if countryCode}
							{@const country = getCountryByIso3(countryCode)}
							{#if country?.iso2}
								<CountryFlag country={country.iso2} width={16} height={16} />
							{/if}
							<span>{countryCode}</span>
						{:else}
							<span>No nationality set</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="name">Display Name</Label>
					<Input id="name" bind:value={name} placeholder="Enter your display name" />
				</div>
				<div class="space-y-2">
					<Label for="country">Nationality</Label>
					<CountrySelect id="country" bind:value={countryCode} />
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleSaveProfile} disabled={savingProfile}>
				{#if savingProfile}Saving...{:else}Update Profile{/if}
			</Button>
		</Card.Footer>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Security</Card.Title>
			<Card.Description>Change your password to keep your account secure.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="new-password">New Password</Label>
					<Input
						id="new-password"
						type="password"
						bind:value={newPassword}
						placeholder="••••••••"
					/>
				</div>
				<div class="space-y-2">
					<Label for="confirm-password">Confirm Password</Label>
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
				variant="outline"
				onclick={handleChangePassword}
				disabled={resettingPassword || !newPassword}
			>
				{#if resettingPassword}Updating...{:else}Change Password{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
