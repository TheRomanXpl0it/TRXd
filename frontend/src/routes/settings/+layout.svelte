<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { 
		User, 
		Palette,
		ShieldAlert,
		ShieldHalf
	} from '@lucide/svelte';
	import { page } from '$app/state';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const ready = $derived(authState.ready);
	const user = $derived(authState.user);

	onMount(() => {
		if (ready && !user) {
			goto('/signIn');
		}
	});

	const items = $derived([
		{ title: 'Profile', href: '/settings/profile', icon: User },
		...(!authState.userMode && user?.team_id ? [
			{ title: 'Team', href: '/settings/team', icon: ShieldHalf }
		] : []),
		{ title: 'Appearance', href: '/settings/appearance', icon: Palette }
	]);

	const currentPath = $derived(page.url.pathname);
</script>

{#if !ready}
	<div class="flex h-[70vh] items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
	</div>
{:else if !user}
	<div class="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
		<ShieldAlert class="h-16 w-16 text-destructive" />
		<h1 class="text-3xl font-bold">Authentication Required</h1>
		<p class="text-muted-foreground">You must be signed in to access settings.</p>
		<Button href="/signIn">Sign In</Button>
	</div>
{:else}
	<div class="flex flex-col gap-8 lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Sidebar Navigation -->
		<aside class="w-full shrink-0 lg:w-64">
			<nav class="flex flex-col gap-6 lg:overflow-visible lg:pb-0">
				<div class="flex flex-col gap-1">
					{#each items as item}
						<Button
							variant={currentPath === item.href ? 'secondary' : 'ghost'}
							href={item.href}
							class="justify-start gap-3 px-4 py-2 text-sm font-medium {currentPath === item.href ? 'bg-primary/10 text-primary hover:bg-primary/15' : ''}"
						>
							<item.icon class="h-4.5 w-4.5" />
							{item.title}
						</Button>
					{/each}
				</div>
			</nav>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 min-w-0">
			{@render children?.()}
		</main>
	</div>
{/if}
