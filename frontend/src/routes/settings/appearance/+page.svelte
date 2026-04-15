<script lang="ts">
	import { setMode, mode, userPrefersMode } from 'mode-watcher';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Sun, Moon, Laptop, LayoutGrid, SquareSplitHorizontal } from '@lucide/svelte';

	const themes = [
		{ id: 'light', name: 'Light', icon: Sun },
		{ id: 'dark', name: 'Dark', icon: Moon },
		{ id: 'system', name: 'System', icon: Laptop }
	];

	const layouts = [
		{ id: 'normal', name: 'Grid View', icon: LayoutGrid, description: 'Classic responsive grid of challenge cards.' },
		{ id: 'sidebar', name: 'Split View', icon: SquareSplitHorizontal, description: 'Sidebar navigation with integrated challenge details.' }
	];

	// Sync local selection state
	let selectedTheme = $state(typeof document !== 'undefined' ? localStorage.getItem('mode-watcher-mode') || 'system' : 'system');

	function updateTheme(id: string) {
		selectedTheme = id;
		setMode(id as any);
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">Appearance</h2>
		<p class="text-muted-foreground">Customize how the platform looks and feels.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Theme</Card.Title>
			<Card.Description>Select your preferred color theme.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each themes as theme}
					<button
						onclick={() => updateTheme(theme.id)}
						class="flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all {(selectedTheme === theme.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'}"
					>
						<theme.icon class="h-6 w-6 {(selectedTheme === theme.id) ? 'text-primary' : 'text-muted-foreground'}" />
						<span class="font-medium text-sm">{theme.name}</span>
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Challenge Layout</Card.Title>
			<Card.Description>Choose how you want to browse and solve challenges.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each layouts as layout}
					<button
						onclick={() => uiStore.setChallengeView(layout.id as any)}
						class="flex items-start gap-4 p-4 rounded-xl border-2 text-left cursor-pointer transition-all {uiStore.challengeView === layout.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'}"
					>
						<div class="mt-1 p-2 rounded-lg {uiStore.challengeView === layout.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}">
							<layout.icon class="h-5 w-5" />
						</div>
						<div class="space-y-1">
							<p class="font-bold text-sm">{layout.name}</p>
							<p class="text-xs text-muted-foreground leading-relaxed">{layout.description}</p>
						</div>
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
