<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { LayoutGrid, SquareSplitHorizontal } from '@lucide/svelte';
	import { uiStore } from '$lib/stores/ui.svelte';

	let {
		size = 'default'
	}: {
		size?: 'default' | 'sm';
	} = $props();

	const btnClass = $derived(size === 'sm' ? 'h-7 w-7' : 'h-8 w-8 md:h-9 md:w-9');
	const iconClass = $derived(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4');
</script>

<div
	class="inline-flex items-center rounded-md border border-border bg-card p-0.5"
	role="group"
	aria-label="Toggle challenge view"
>
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button
				variant="ghost"
				size="icon"
				class="{btnClass} rounded-sm {uiStore.challengeView === 'normal'
					? 'bg-muted text-foreground shadow-xs'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => uiStore.setChallengeView('normal')}
				aria-label="Grid view"
				data-testid="toggle-view-grid"
			>
				<LayoutGrid class={iconClass} />
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>Grid view</Tooltip.Content>
	</Tooltip.Root>
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button
				variant="ghost"
				size="icon"
				class="{btnClass} rounded-sm {uiStore.challengeView === 'sidebar'
					? 'bg-muted text-foreground shadow-xs'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => uiStore.setChallengeView('sidebar')}
				aria-label="Split view"
				data-testid="toggle-view-sidebar"
			>
				<SquareSplitHorizontal class={iconClass} />
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>Split view</Tooltip.Content>
	</Tooltip.Root>
</div>
