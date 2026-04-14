<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import {
		completeVerifiedRegistration,
		register,
		requestRegistrationVerification
	} from '$lib/auth';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { authState, loadUser } from '@/stores/auth';
	import { siteContent } from '$lib/site-content';
	import { onMount } from 'svelte';
	import { UserPlus } from '@lucide/svelte';

	const PENDING_SIGNUP_KEY = 'pending-signup';

	type PendingSignup = {
		email: string;
		name: string;
		password: string;
	};

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let token = $state('');

	let loading = $state(false);
	let errorMsg = $state<string | null>(null);
	let verificationRequested = $state(false);
	let verificationEmail = $state('');

	const emailVerificationEnabled = $derived(Boolean(authState.emailVerification));
	const isVerificationStep = $derived(
		emailVerificationEnabled && (verificationRequested || token.trim().length > 0)
	);

	function readPendingSignup(): PendingSignup | null {
		if (typeof window === 'undefined') return null;
		const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw) as Partial<PendingSignup>;
			if (!parsed.email || !parsed.name || !parsed.password) return null;
			return {
				email: parsed.email,
				name: parsed.name,
				password: parsed.password
			};
		} catch {
			sessionStorage.removeItem(PENDING_SIGNUP_KEY);
			return null;
		}
	}

	function savePendingSignup(data: PendingSignup) {
		if (typeof window === 'undefined') return;
		sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
	}

	function clearPendingSignup() {
		if (typeof window === 'undefined') return;
		sessionStorage.removeItem(PENDING_SIGNUP_KEY);
	}

	function clearVerificationTokenFromUrl() {
		if (typeof window === 'undefined') return;
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.delete('token');
		window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
	}

	function syncPendingSignup() {
		const pending = readPendingSignup();
		if (!pending) return;
		name ||= pending.name;
		email ||= pending.email;
		password ||= pending.password;
		confirm ||= pending.password;
		verificationEmail ||= pending.email;
		verificationRequested = true;
	}

	onMount(() => {
		if (typeof window === 'undefined') return;
		const queryToken = new URL(window.location.href).searchParams.get('token')?.trim() ?? '';
		if (queryToken) {
			token = queryToken;
			verificationRequested = true;
		}
		syncPendingSignup();

		// Auto-submit if we have everything needed
		if (token && name && password && isVerificationStep) {
			onSubmit(new Event('submit'));
		}
	});

	function validateInitialStep(): string | null {
		if (!name.trim()) return 'Please enter your name.';
		if (!email.trim()) return 'Please enter your email.';
		if (password.length < 8) return 'Password must be at least 8 characters.';
		if (password !== confirm) return 'Passwords do not match.';
		return null;
	}

	function validateVerificationStep(): string | null {
		if (!token.trim()) return 'Please enter the verification token.';
		if (!name.trim()) return 'Please enter your name.';
		if (password.length < 8) return 'Password must be at least 8 characters.';
		if (password !== confirm) return 'Passwords do not match.';
		return null;
	}

	function startVerificationStep() {
		errorMsg = null;
		verificationRequested = true;
		if (email.trim()) {
			verificationEmail = email.trim();
		}
	}

	function resetVerificationStep() {
		errorMsg = null;
		token = '';
		verificationRequested = false;
		verificationEmail = '';
		clearPendingSignup();
		clearVerificationTokenFromUrl();
	}

	async function onSubmit(e: Event) {
		e.preventDefault();
		errorMsg = isVerificationStep ? validateVerificationStep() : validateInitialStep();
		if (errorMsg) return;

		loading = true;
		try {
			if (emailVerificationEnabled && !isVerificationStep) {
				const trimmedEmail = email.trim();
				savePendingSignup({
					email: trimmedEmail,
					name: name.trim(),
					password
				});
				await requestRegistrationVerification(trimmedEmail);
				verificationRequested = true;
				verificationEmail = trimmedEmail;
				toast.success('Verification email sent. Finish creating the account with the token.');
				return;
			}

			if (emailVerificationEnabled) {
				await completeVerifiedRegistration(token.trim(), name.trim(), password);
				clearPendingSignup();
				clearVerificationTokenFromUrl();
			} else {
				await register(email.trim(), password, name.trim());
			}

			await loadUser();
			toast.success(
				emailVerificationEnabled ? 'Email verified. Welcome aboard!' : 'Welcome aboard!'
			);
			if (authState.user?.team_id) {
				goto('/challenges');
			} else {
				goto('/team');
			}
		} catch (err: any) {
			let message = 'Registration failed. Please try again.';
			if (err?.message) {
				try {
					const parsed = JSON.parse(err.message);
					message = parsed.error || message;
				} catch {
					message = err.message;
				}
			}
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
				<Card.Title class="text-2xl font-bold tracking-tight">
					{#if isVerificationStep}
						Verify your email
					{:else}
						Create an account
					{/if}
				</Card.Title>
				<Card.Description class="text-base">
					{#if emailVerificationEnabled}
						{#if isVerificationStep}
							Paste the verification token from your email to finish creating the account.
						{:else}
							Confirm your email before your account is created.
						{/if}
					{:else}
						{$siteContent.auth.signUpDescription}
					{/if}
				</Card.Description>
			</Card.Header>
		</div>

		<form onsubmit={onSubmit} class="p-8 pt-6">
			<Card.Content class="space-y-6 p-0">
				{#if emailVerificationEnabled && isVerificationStep}
					<div class="bg-muted/40 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
						{#if verificationEmail || email.trim()}
							Verification email sent to
							<span class="text-foreground font-medium">{verificationEmail || email.trim()}</span>.
						{:else}
							Paste the verification token from your verification email below.
						{/if}
						If the email link does not open this page, copy the token value from the link and
						paste it here.
					</div>
				{/if}

				<div class="space-y-4">
					{#if emailVerificationEnabled && isVerificationStep}
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
					{/if}

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

					{#if emailVerificationEnabled && isVerificationStep}
						{#if verificationEmail || email.trim()}
							<div class="space-y-2">
								<Label for="verification-email" class="font-medium">Email</Label>
								<Input
									id="verification-email"
									type="email"
									value={verificationEmail || email.trim()}
									readonly
									disabled
									class="bg-background/40 text-muted-foreground"
								/>
							</div>
						{/if}
					{:else}
						<div class="space-y-2">
							<Label for="email" class="font-medium">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="name@email.com"
								bind:value={email}
								required
								class="bg-background/50"
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
								{#if emailVerificationEnabled && !isVerificationStep}
									Sending verification email...
								{:else if emailVerificationEnabled}
									Completing sign up...
								{:else}
									Signing up...
								{/if}
							</span>
						{:else if emailVerificationEnabled && !isVerificationStep}
							Send verification email
						{:else if emailVerificationEnabled}
							Complete sign up
						{:else}
							Sign up
						{/if}
					</Button>

					{#if emailVerificationEnabled}
						{#if isVerificationStep}
							<Button type="button" variant="outline" class="w-full" onclick={resetVerificationStep}>
								Back to email step
							</Button>
						{/if}
					{/if}
				</div>
			</Card.Content>

			<Card.Footer class="text-muted-foreground mt-6 flex flex-col gap-4 p-0 text-center text-sm">
				<div class="flex w-full items-center gap-4">
					<span class="bg-border h-px flex-1"></span>
					<span class="text-muted-foreground text-xs uppercase">Or</span>
					<span class="bg-border h-px flex-1"></span>
				</div>
				<p>
					Already have an account?{' '}
					<Button
						variant="link"
						class="text-primary h-auto p-0 font-semibold"
						type="button"
						onclick={() => goto('/signIn')}
					>
						Sign in
					</Button>
				</p>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
