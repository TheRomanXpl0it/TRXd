<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { siteContent } from '$lib/site-content';
	import { setMode, mode } from 'mode-watcher';
	import { onMount } from 'svelte';
	import {
		Palette,
		User,
		ShieldHalf,
		Settings2,
		Eye,
		Monitor,
		Moon,
		Sun,
		Joystick
	} from '@lucide/svelte';

	import { uiStore } from '$lib/stores/ui.svelte';

	function updateChallengeView(val: string) {
		uiStore.setChallengeView(val as 'normal' | 'sidebar');
	}

	const challengeView = $derived(uiStore.challengeView);

	const user = $derived(authState.user);
	const userMode = $derived(authState.userMode);
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-foreground text-3xl font-bold uppercase tracking-tight tracking-tighter">
			Settings
		</h1>
		<p class="text-muted-foreground mt-1">
			Manage your account preferences and frontend customization.
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Account Info -->
		<Card.Root class="border-muted/50 bg-card/50 backdrop-blur-sm">
			<Card.Header>
				<Card.Title class="flex items-center gap-3 text-lg font-bold">
					<div class="bg-primary/10 text-primary rounded-lg p-2">
						<User class="h-5 w-5" />
					</div>
					Account Details
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex flex-col gap-1.5">
					<Label
						class="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70"
						>Logged in as</Label
					>
					<p class="text-base font-bold">{user?.name || 'Anonymous'}</p>
				</div>
				{#if !userMode && user?.team_id}
					<div class="flex flex-col gap-1.5">
						<Label
							class="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70"
							>Team</Label
						>
						<p class="flex items-center gap-2 text-base font-bold">
							<ShieldHalf class="text-primary h-4 w-4" />
							Joined
						</p>
					</div>
				{/if}
				<div class="flex flex-col gap-1.5">
					<Label
						class="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70"
						>Role</Label
					>
					<p
						class="text-primary bg-primary/10 w-fit rounded px-2 py-0.5 text-sm font-bold uppercase tracking-wider"
					>
						{user?.role || 'User'}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Appearance -->
		<Card.Root class="border-muted/50 bg-card/50 backdrop-blur-sm">
			<Card.Header>
				<Card.Title class="flex items-center gap-3 text-lg font-bold">
					<div class="bg-primary/10 text-primary rounded-lg p-2">
						<Palette class="h-5 w-5" />
					</div>
					Appearance
				</Card.Title>
				<Card.Description>{$siteContent.settings.appearanceDescription}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="space-y-4">
					<Label
						class="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70"
						>Global Theme</Label
					>
					<RadioGroup.Root
						value={mode.current}
						onValueChange={(v) => setMode(v as any)}
						class="grid grid-cols-3 gap-3"
					>
						<div>
							<RadioGroup.Item value="light" id="light" class="peer sr-only" />
							<Label
								for="light"
								class="border-muted bg-popover/50 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 transition-all"
							>
								<Sun
									class="text-muted-foreground group-hover:text-primary mb-1.5 h-5 w-5 transition-colors"
								/>
								<span class="text-xs font-bold uppercase tracking-widest">Light</span>
							</Label>
						</div>
						<div>
							<RadioGroup.Item value="dark" id="dark" class="peer sr-only" />
							<Label
								for="dark"
								class="border-muted bg-popover/50 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 transition-all"
							>
								<Moon
									class="text-muted-foreground group-hover:text-primary mb-1.5 h-5 w-5 transition-colors"
								/>
								<span class="text-xs font-bold uppercase tracking-widest">Dark</span>
							</Label>
						</div>
						<div>
							<RadioGroup.Item value="system" id="system" class="peer sr-only" />
							<Label
								for="system"
								class="border-muted bg-popover/50 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 transition-all"
							>
								<Monitor
									class="text-muted-foreground group-hover:text-primary mb-1.5 h-5 w-5 transition-colors"
								/>
								<span class="text-xs font-bold uppercase tracking-widest">System</span>
							</Label>
						</div>
					</RadioGroup.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Customization -->
		<Card.Root class="border-muted/50 bg-card/50 overflow-hidden backdrop-blur-sm md:col-span-2">
			<Card.Header>
				<Card.Title class="flex items-center gap-3 text-lg font-bold">
					<div class="bg-primary/10 text-primary rounded-lg p-2">
						<Settings2 class="h-5 w-5" />
					</div>
					Challenges Layout
				</Card.Title>
				<Card.Description>Choose your preferred way to discover and solve tasks.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-8">
				<div class="grid gap-6 sm:grid-cols-2">
					<div
						class="hover:border-primary/50 group relative flex cursor-pointer flex-col gap-4 rounded-xl border-2 p-4 transition-all {challengeView ===
						'normal'
							? 'border-primary bg-primary/5 ring-primary/5 ring-4'
							: 'border-muted/50 bg-muted/20'}"
						onclick={() => updateChallengeView('normal')}
						onkeydown={(e) => e.key === 'Enter' && updateChallengeView('normal')}
						role="button"
						tabindex="0"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="bg-primary/10 text-primary rounded-lg p-2.5 transition-transform group-hover:scale-110"
								>
									<Eye class="h-5 w-5" />
								</div>
								<div class="space-y-1">
									<p class="text-lg font-black uppercase tracking-tight">Standard View</p>
									<p class="text-muted-foreground text-xs font-medium">
										Category-based scrolling grid
									</p>
								</div>
							</div>
						</div>
					</div>

					<div
						class="hover:border-primary/50 group relative flex cursor-pointer flex-col gap-4 rounded-xl border-2 p-4 transition-all {challengeView ===
						'sidebar'
							? 'border-primary bg-primary/5 ring-primary/5 ring-4'
							: 'border-muted/50 bg-muted/20'}"
						onclick={() => updateChallengeView('sidebar')}
						onkeydown={(e) => e.key === 'Enter' && updateChallengeView('sidebar')}
						role="button"
						tabindex="0"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="bg-primary/10 text-primary rounded-lg p-2.5 transition-transform group-hover:scale-110"
								>
									<Joystick class="h-5 w-5" />
								</div>
								<div class="space-y-1">
									<p class="text-lg font-black uppercase tracking-tight">Sidebar View</p>
									<p class="text-muted-foreground text-xs font-medium">More compact view</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
