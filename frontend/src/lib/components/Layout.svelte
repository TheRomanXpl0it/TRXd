<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	interface Props {
		user: any;
		userMode: boolean;
		isLandingPage?: boolean;
		children?: import('svelte').Snippet;
	}

	let { user, userMode, isLandingPage = false, children }: Props = $props();
</script>

{#if isLandingPage}
	<main class="min-h-screen">
		{@render children?.()}
	</main>
{:else}
	<div class="bg-background flex min-h-screen flex-col">
		<Navbar {user} {userMode} />

		<main class="flex-1 min-h-0">
			<div
				class="router-content mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
			>
				{@render children?.()}
			</div>
		</main>
	</div>
{/if}
