<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { joinTeam } from '$lib/team';
	import { toast } from 'svelte-sonner';
	import { Users, ArrowLeft } from '@lucide/svelte';
	import { authState, loadUser } from '$lib/stores/auth';

	$effect(() => {
		if (authState.ready && authState.user?.team_id) {
			goto('/team');
		}
	});

	let joinName = $state('');
	let joinPassword = $state('');
	let joinLoading = $state(false);
	let joinError: string | null = $state(null);

	async function onJoinSubmit(e: Event) {
		e.preventDefault();
		joinError = null;

		if (!joinName.trim() || !joinPassword.trim()) {
			joinError = 'Please fill in both fields.';
			return;
		}

		joinLoading = true;
		try {
			await joinTeam(joinName, joinPassword);
			await loadUser(true);
			toast.success('Team Joined, welcome aboard!');
			goto('/team');
		} catch (err: any) {
			joinError = err?.message ?? 'Failed to join team.';
			toast.error(joinError ?? 'Error');
		} finally {
			joinLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Join Team - TRXd</title>
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
					<Users strokeWidth={1.5} class="h-8 w-8" />
				</div>
				<Card.Title class="text-2xl font-bold tracking-tight">Join a Team</Card.Title>
				<Card.Description class="text-muted-foreground text-base">
					Enter your team's access credentials to join
				</Card.Description>
			</Card.Header>
		</div>

		<form onsubmit={onJoinSubmit} class="p-8 pt-6">
			<Card.Content class="space-y-6 p-0">
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="join-name" class="font-medium">Team Name</Label>
						<Input
							id="join-name"
							placeholder="e.g. TheRomanXpl0it"
							bind:value={joinName}
							required
							class="bg-background/50 h-11"
						/>
					</div>

					<div class="space-y-2">
						<Label for="join-pass" class="font-medium">Team Password</Label>
						<Input
							id="join-pass"
							type="password"
							placeholder="••••••••"
							bind:value={joinPassword}
							required
							class="bg-background/50 h-11"
						/>
					</div>
				</div>

				{#if joinError}
					<div class="text-destructive text-sm font-medium">{joinError}</div>
				{/if}

				<Button
					type="submit"
					disabled={joinLoading}
					class="h-11 w-full font-semibold shadow-sm transition-all"
					size="lg"
				>
					{#if joinLoading}
						<span
							class="border-background mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
						></span>
						Joining...
					{:else}
						Join Team
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
					Don't have a team yet?
					<button
						class="text-primary h-auto p-0 font-semibold hover:underline"
						type="button"
						onclick={() => goto('/team/create')}
					>
						Create one
					</button>
				</p>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
