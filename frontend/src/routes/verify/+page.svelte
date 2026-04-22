<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { completeVerifiedRegistration } from '$lib/auth';
	import { authState, loadUser } from '@/stores/auth';
	import { clearPendingSignup, readPendingSignup } from '$lib/registration';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { UserPlus } from '@lucide/svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let token = $state('');

	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	function clearVerificationTokenFromUrl() {
		if (typeof window === 'undefined') return;
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.delete('token');
		window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
	}

	function syncPendingSignup() {
		const pending = readPendingSignup();
		if (!pending) return;

		if (pending.name) {
			name ||= pending.name;
		}
		email ||= pending.email;
		if (pending.password) {
			password ||= pending.password;
			confirm ||= pending.password;
		}
	}

	onMount(() => {
		token = new URL(window.location.href).searchParams.get('token')?.trim() ?? '';
		syncPendingSignup();

		if (token && name && password) {
			onSubmit(new Event('submit'));
		}
	});

	function validate(): string | null {
		if (!token.trim()) {
			return 'Verification token missing. Open the link from your email or paste the token manually.';
		}
		if (!name.trim()) return 'Please enter your name.';
		if (password.length < 8) return 'Password must be at least 8 characters.';
		if (password !== confirm) return 'Passwords do not match.';
		return null;
	}

	async function onSubmit(e: Event) {
		e.preventDefault();
		errorMsg = validate();
		if (errorMsg) return;

		loading = true;
		try {
			await completeVerifiedRegistration(token.trim(), name, password);
			clearPendingSignup();
			clearVerificationTokenFromUrl();

			await loadUser();
			toast.success('Email verified. Welcome aboard!');
			if (authState.user?.team_id) {
				goto('/challenges');
			} else {
				goto('/team');
			}
		} catch (err: any) {
			const message = err?.message ?? 'Registration failed. Please try again.';
			errorMsg = message;
			toast.error(message);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[80vh] items-center justify-center px-4 py-12">
	<Card.Root
		class="bg-card/50 mx-auto w-full max-w-md border-0 shadow-xl backdrop-blur-sm sm:max-w-[450px]"
	>
		<div class="p-8 pb-0">
			<Card.Header class="space-y-2 p-0 text-center">
				<div
					class="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
				>
					<UserPlus class="text-primary h-6 w-6" />
				</div>
				<Card.Title class="text-2xl font-bold tracking-tight">Verify your email</Card.Title>
				<Card.Description class="text-base">
					Finish creating your account with the verification token from your email.
				</Card.Description>
			</Card.Header>
		</div>

		<form onsubmit={onSubmit} class="p-8 pt-6">
			<Card.Content class="space-y-6 p-0">
				<div class="bg-muted/40 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
					If the email link opened this page automatically, your token is already filled in. Otherwise,
					paste it below to continue.
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="token" class="font-medium">Verification token</Label>
						<Input
							id="token"
							name="token"
							type="text"
							placeholder="Paste verification token"
							bind:value={token}
							required
							class="bg-background/50 font-mono text-xs"
						/>
					</div>

					<div class="space-y-2">
						<Label for="name" class="font-medium">Username</Label>
						<Input
							id="name"
							name="name"
							type="text"
							placeholder="Your username"
							bind:value={name}
							required
							class="bg-background/50"
						/>
					</div>

					{#if email.trim()}
						<div class="space-y-2">
							<Label for="email" class="font-medium">Email</Label>
							<Input
								id="email"
								type="email"
								value={email.trim()}
								readonly
								disabled
								class="bg-background/40 text-muted-foreground"
							/>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="password" class="font-medium">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							placeholder="********"
							minlength={8}
							bind:value={password}
							required
							class="bg-background/50"
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400">At least 8 characters.</p>
					</div>

					<div class="space-y-2">
						<Label for="confirm" class="font-medium">Confirm password</Label>
						<Input
							id="confirm"
							name="confirm"
							type="password"
							placeholder="********"
							minlength={8}
							bind:value={confirm}
							required
							class="bg-background/50"
						/>
					</div>
				</div>

				{#if errorMsg}
					<div class="text-sm text-red-600 dark:text-red-400">{errorMsg}</div>
				{/if}

				<div class="space-y-3">
					<Button type="submit" class="w-full font-semibold shadow-sm" size="lg" disabled={loading}>
						{#if loading}
							<span class="inline-flex items-center gap-2">
								<Spinner />
								Completing sign up...
							</span>
						{:else}
							Complete sign up
						{/if}
					</Button>

					<Button type="button" variant="outline" class="w-full" onclick={() => goto('/signUp')}>
						Back to sign up
					</Button>
				</div>
			</Card.Content>
		</form>
	</Card.Root>
</div>
