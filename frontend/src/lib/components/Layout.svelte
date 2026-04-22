<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import PixelBackground from '$lib/components/ui/PixelBackground.svelte';
	import { page } from '$app/state';
	import {
		pixelBackgroundOverride,
		type PixelBackgroundConfig
	} from '$lib/stores/pixel-background';

	interface Props {
		user: any;
		userMode: boolean;
		isLandingPage?: boolean;
		children?: import('svelte').Snippet;
	}

	let { user, userMode, isLandingPage = false, children }: Props = $props();

	const defaultBackgroundConfig: PixelBackgroundConfig = {
		theme: 'default',
		opacity: 0.34,
		overlayOpacity: 0.28,
		blurAmount: 4,
		edgeOverlayOpacity: 0.92,
		darkEdgeOverlayOpacity: 0.84
	};

	const scoreboardBackgroundConfig: PixelBackgroundConfig = {
		...defaultBackgroundConfig,
		theme: 'mixed',
		opacity: 0.15,
		overlayOpacity: 0.52,
		blurAmount: 3
	};

	const shouldShowBackground = $derived.by(() => {
		const { pathname } = page.url;
		return (
			pathname === '/' ||
			pathname === '/home' ||
			pathname === '/scoreboard' ||
			pathname.startsWith('/challenges')
		);
	});

	const routeBackgroundConfig = $derived.by(() => {
		if (page.url.pathname === '/scoreboard') {
			return scoreboardBackgroundConfig;
		}

		return defaultBackgroundConfig;
	});

	const backgroundConfig = $derived.by(() => ({
		...routeBackgroundConfig,
		...($pixelBackgroundOverride ?? {})
	}));
</script>

{#if isLandingPage}
	<div class="relative isolate min-h-screen">
		{#if shouldShowBackground}
			<PixelBackground
				theme={backgroundConfig.theme}
				opacity={backgroundConfig.opacity}
				overlayOpacity={backgroundConfig.overlayOpacity}
				blurAmount={backgroundConfig.blurAmount}
				edgeOverlayOpacity={backgroundConfig.edgeOverlayOpacity}
				darkEdgeOverlayOpacity={backgroundConfig.darkEdgeOverlayOpacity}
			/>
		{/if}

		<main class="relative z-10 min-h-screen">
			{@render children?.()}
		</main>
	</div>
{:else}
	<div class="bg-background relative isolate min-h-screen">
		{#if shouldShowBackground}
			<PixelBackground
				theme={backgroundConfig.theme}
				opacity={backgroundConfig.opacity}
				overlayOpacity={backgroundConfig.overlayOpacity}
				blurAmount={backgroundConfig.blurAmount}
				edgeOverlayOpacity={backgroundConfig.edgeOverlayOpacity}
				darkEdgeOverlayOpacity={backgroundConfig.darkEdgeOverlayOpacity}
			/>
		{/if}

		<div class="relative z-10 flex min-h-screen flex-col">
			<Navbar {user} {userMode} />

			<main class="min-h-0 flex-1">
				<div class="router-content mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					{@render children?.()}
				</div>
			</main>
		</div>
	</div>
{/if}
