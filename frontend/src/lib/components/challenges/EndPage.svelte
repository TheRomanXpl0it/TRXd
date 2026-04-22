<script lang="ts">
	import { Trophy, FlagOff, Medal, BarChart3, ChevronRight } from '@lucide/svelte';
	import { Button } from '../ui/button';
	import { goto } from '$app/navigation';
	import {
		resetPixelBackgroundOverride,
		setPixelBackgroundOverride
	} from '$lib/stores/pixel-background';

	let { endTime, title = 'CTF Ended' } = $props<{
		endTime: string | null;
		title?: string;
	}>();

	const formattedEndTime = $derived(
		endTime
			? new Date(endTime).toLocaleString('en-GB', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: 'Just now'
	);

	const floatingIcons = [
		{ icon: Trophy, top: '15%', left: '10%', delay: '0s', size: 28, speed: '12s' },
		{ icon: Medal, top: '25%', left: '85%', delay: '1.5s', size: 32, speed: '15s' },
		{ icon: FlagOff, top: '65%', left: '5%', delay: '0.8s', size: 24, speed: '10s' },
		{ icon: BarChart3, top: '75%', left: '90%', delay: '2.2s', size: 26, speed: '18s' }
	];

	const endPageBackground = {
		theme: 'finished' as const,
		opacity: 0.2,
		overlayOpacity: 0.4
	};

	$effect(() => {
		setPixelBackgroundOverride(endPageBackground);

		return () => {
			resetPixelBackgroundOverride();
		};
	});
</script>

<div
	class="relative z-10 flex min-h-[calc(100vh-100px)] w-full flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Floating Elements -->
	{#each floatingIcons as item}
		<div
			class="animate-float z-2 text-primary/20 pointer-events-none absolute"
			style="top: {item.top}; left: {item.left}; --float-delay: {item.delay}; --float-speed: {item.speed};"
		>
			<item.icon size={item.size} strokeWidth={1} />
		</div>
	{/each}

	<!-- Foreground Content -->
	<div class="relative z-10 w-full max-w-4xl space-y-12 p-8 md:p-16">
		<div class="space-y-6">
			<h1
				class="text-foreground pb-2 text-5xl font-black leading-tight tracking-tighter md:text-8xl"
			>
				{title}
			</h1>

			<div class="mx-auto max-w-xl space-y-4">
				<p class="text-xl font-medium leading-relaxed opacity-80">
					The final flag has been submitted. The CTF officially concluded on <span
						class="text-primary font-bold">{formattedEndTime}</span
					>.
				</p>
				<p class="text-lg font-medium italic opacity-60">Thank you for participating!</p>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button
				onclick={() => goto('/scoreboard')}
				size="lg"
				class="h-14 min-w-[200px] cursor-pointer gap-2 px-8 text-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
			>
				<BarChart3 size={20} />
				Final Scoreboard
				<ChevronRight size={18} />
			</Button>
		</div>
	</div>
</div>

<style>
	@keyframes float {
		0% {
			transform: translate(0, 0) rotate(0deg);
		}
		33% {
			transform: translate(10px, -15px) rotate(3deg);
		}
		66% {
			transform: translate(-5px, -25px) rotate(-3deg);
		}
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
	}

	.animate-float {
		animation: float var(--float-speed) ease-in-out infinite;
		animation-delay: var(--float-delay);
	}
</style>
