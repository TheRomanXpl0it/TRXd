<script lang="ts">
	import { setMode } from 'mode-watcher';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Sun, Moon, Laptop, LayoutGrid, SquareSplitHorizontal } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type ThemeId = 'light' | 'dark' | 'system';
	type LayoutId = 'normal' | 'sidebar';

	const themes: { id: ThemeId; name: string; icon: typeof Sun }[] = [
		{ id: 'light', name: 'Light', icon: Sun },
		{ id: 'dark', name: 'Dark', icon: Moon },
		{ id: 'system', name: 'System', icon: Laptop }
	];

	const layouts: { id: LayoutId; name: string; icon: typeof LayoutGrid; description: string }[] = [
		{
			id: 'normal',
			name: 'Grid View',
			icon: LayoutGrid,
			description: 'Classic responsive grid of challenge cards.'
		},
		{
			id: 'sidebar',
			name: 'Split View',
			icon: SquareSplitHorizontal,
			description: 'Sidebar navigation with integrated challenge details.'
		}
	];

	const savedTheme =
		typeof document !== 'undefined' ? localStorage.getItem('mode-watcher-mode') : null;
	const initialTheme: ThemeId =
		savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
			? savedTheme
			: 'system';

	let appliedTheme = $state<ThemeId>(initialTheme);
	let selectedTheme = $state<ThemeId>(initialTheme);
	let selectedLayout = $state<LayoutId>(uiStore.challengeView);

	const hasChanges = $derived(
		selectedTheme !== appliedTheme || selectedLayout !== uiStore.challengeView
	);

	function selectTheme(id: ThemeId) {
		selectedTheme = id;
	}

	function applySettings() {
		setMode(selectedTheme);
		uiStore.setChallengeView(selectedLayout);
		appliedTheme = selectedTheme;
		toast.success('Appearance settings applied.');
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
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{#each themes as theme}
					<button
						onclick={() => selectTheme(theme.id)}
						class="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all {selectedTheme ===
						theme.id
							? 'border-primary bg-primary/5'
							: 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'}"
					>
						<theme.icon
							class="h-6 w-6 {selectedTheme === theme.id
								? 'text-primary'
								: 'text-muted-foreground'}"
						/>
						<span class="text-sm font-medium">{theme.name}</span>
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
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each layouts as layout}
					<button
						onclick={() => (selectedLayout = layout.id)}
						class="flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-left transition-all {selectedLayout ===
						layout.id
							? 'border-primary bg-primary/5'
							: 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'}"
					>
						<div
							class="mt-1 rounded-lg p-2 {selectedLayout === layout.id
								? 'bg-primary/10 text-primary'
								: 'bg-muted text-muted-foreground'}"
						>
							<layout.icon class="h-5 w-5" />
						</div>
						<div class="space-y-1">
							<p class="text-sm font-bold">{layout.name}</p>
							<p class="text-muted-foreground text-xs leading-relaxed">{layout.description}</p>
						</div>
					</button>
				{/each}
			</div>
		</Card.Content>
		<Card.Footer class="bg-muted/20 mt-4 flex justify-end border-t px-6 py-4">
			<Button onclick={applySettings} disabled={!hasChanges}>Save / Apply</Button>
		</Card.Footer>
	</Card.Root>
</div>
