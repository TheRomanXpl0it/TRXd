<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { createTeam } from '$lib/team';
	import { toast } from 'svelte-sonner';
	import { ShieldPlus, ArrowLeft } from '@lucide/svelte';
	import { authState, loadUser } from '$lib/stores/auth';

	$effect(() => {
		if (authState.ready && authState.user?.team_id) {
			goto('/team');
		}
	});

	let registerName = $state('');
	let registerPassword = $state('');
	let confirmRegisterPassword = $state('');
	let registerLoading = $state(false);
	let registerError: string | null = $state(null);

	async function onRegisterSubmit(e: Event) {
		e.preventDefault();
		registerError = null;

		if (!registerName.trim() || !registerPassword.trim() || !confirmRegisterPassword.trim()) {
			registerError = 'Please fill all fields.';
			return;
		}

		if (registerPassword !== confirmRegisterPassword) {
			registerError = 'Passwords do not match.';
			toast.error(registerError);
			return;
		}

		if (registerPassword.length < 8) {
			registerError = 'Password must be at least 8 characters.';
			toast.error(registerError);
			return;
		}

		registerLoading = true;
		try {
			await createTeam(registerName, registerPassword);
			await loadUser(true);
			toast.success('Team Created successfully!');
			goto('/team');
		} catch (err: any) {
			registerError = err?.message ?? 'Failed to register team.';
			toast.error(registerError as string);
		} finally {
			registerLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Team - TRXd</title>
</svelte:head>

<div class="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
	<div class="mx-auto mb-4 w-full max-w-md sm:max-w-[420px]">
		<Button variant="ghost" onclick={() => goto('/team')} class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back
		</Button>
	</div>
	<Card.Root
		class="bg-card/50 hover:border-primary mx-auto w-full max-w-md border-2 border-zinc-200/10 shadow-xl backdrop-blur-sm transition-all duration-300 sm:max-w-[420px]"
	>
		<div class="p-8 pb-0">
			<Card.Header class="space-y-2 p-0 text-center">
				<div
					class="bg-primary/10 text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
				>
					<ShieldPlus strokeWidth={1.5} class="h-8 w-8" />
				</div>
				<Card.Title class="text-2xl font-bold tracking-tight">Create Team</Card.Title>
			</Card.Header>
		</div>

		<form onsubmit={onRegisterSubmit} class="p-8 pt-6">
			<Card.Content class="space-y-6 p-0">
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="reg-name" class="font-medium">Team Name</Label>
						<Input
							id="reg-name"
							placeholder="e.g. TRX_Elite"
							bind:value={registerName}
							required
							class="bg-background/50 h-11"
						/>
					</div>

					<div class="space-y-2">
						<Label for="reg-pass" class="font-medium">Team Password</Label>
						<Input
							id="reg-pass"
							type="password"
							placeholder="••••••••"
							bind:value={registerPassword}
							required
							class="bg-background/50 h-11"
						/>
					</div>

					<div class="space-y-2">
						<Label for="confirm-pass" class="font-medium">Confirm Password</Label>
						<Input
							id="confirm-pass"
							type="password"
							placeholder="••••••••"
							bind:value={confirmRegisterPassword}
							required
							class="bg-background/50 h-11"
						/>
					</div>
				</div>

				{#if registerError}
					<div class="text-destructive text-sm font-medium">{registerError}</div>
				{/if}

				<Button
					type="submit"
					disabled={registerLoading}
					class="h-11 w-full font-semibold shadow-sm transition-all"
					size="lg"
				>
					{#if registerLoading}
						<span
							class="border-background mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
						></span>
						Creating...
					{:else}
						Create New Team
					{/if}
				</Button>
			</Card.Content>

			<Card.Footer class="text-muted-foreground mt-8 flex flex-col gap-4 p-0 text-center text-sm">
				<div class="flex w-full items-center gap-4">
					<span class="bg-border h-px flex-1"></span>
					<span class="text-muted-foreground text-xs uppercase">Or</span>
					<span class="bg-border h-px flex-1"></span>
				</div>
				<p>
					Looking for an existing team?
					<button
						class="text-primary h-auto p-0 font-semibold hover:underline"
						type="button"
						onclick={() => goto('/team/join')}
					>
						Join one
					</button>
				</p>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
