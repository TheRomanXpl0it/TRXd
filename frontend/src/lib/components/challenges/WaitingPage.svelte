<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Code, Database, Lock, Shield } from '@lucide/svelte';
	import PixelBackground from '../ui/PixelBackground.svelte';

	let { startTime, title = 'Starting soon' } = $props<{
		startTime: string | null;
		title?: string;
	}>();

	let timeLeft = $state({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		total: 0
	});

	let interval: any;

	function updateCountdown() {
		if (!startTime) return;

		const start = new Date(startTime).getTime();
		const now = new Date().getTime();
		const diff = start - now;

		if (diff <= 0) {
			timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
			if (interval) clearInterval(interval);
			if (typeof window !== 'undefined') window.location.reload();
			return;
		}

		timeLeft = {
			days: Math.floor(diff / (1000 * 60 * 60 * 24)),
			hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
			minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
			seconds: Math.floor((diff % (1000 * 60)) / 1000),
			total: diff
		};
	}

	onMount(() => {
		updateCountdown();
		interval = setInterval(updateCountdown, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	const formattedStartTime = $derived(
		startTime
			? new Date(startTime).toLocaleString('en-GB', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: 'To be announced'
	);

	const floatingIcons = [
		{ icon: Code, top: '15%', left: '10%', delay: '0s', size: 24, speed: '12s' },
		{ icon: Database, top: '25%', left: '85%', delay: '1.5s', size: 32, speed: '15s' },
		{ icon: Lock, top: '65%', left: '5%', delay: '0.8s', size: 28, speed: '10s' },
		{ icon: Shield, top: '75%', left: '90%', delay: '2.2s', size: 20, speed: '18s' }
	];
</script>

<PixelBackground />

<div
	class="relative flex min-h-[calc(100vh-100px)] w-full flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Floating Elements -->
	{#each floatingIcons as item}
		<div
			class="animate-float z-2 text-primary/30 pointer-events-none absolute"
			style="top: {item.top}; left: {item.left}; --float-delay: {item.delay}; --float-speed: {item.speed};"
		>
			<item.icon size={item.size} strokeWidth={1} />
		</div>
	{/each}

	<!-- Foreground Content -->
	<div class="relative z-10 w-full max-w-4xl space-y-16 p-8 md:p-16">
		<div class="space-y-6">
			<h1
				class="text-foreground pb-2 text-5xl font-black leading-tight tracking-tighter md:text-8xl"
			>
				{title}
			</h1>
			<p class="mx-auto max-w-xl text-xl font-medium leading-relaxed opacity-80">
				The CTF starts on <span class="text-primary font-bold">{formattedStartTime}</span>.
			</p>
			<p class="mx-auto max-w-xl text-lg font-medium italic opacity-60">Prepare your horses</p>
		</div>

		<!-- Countdown Units -->
		<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
			{#each [{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }, { label: 'Minutes', value: timeLeft.minutes }, { label: 'Seconds', value: timeLeft.seconds }] as unit}
				<div class="group flex flex-col items-center">
					<span
						class="text-foreground font-mono text-5xl font-black tabular-nums tracking-tighter md:text-8xl"
					>
						{String(unit.value).padStart(2, '0')}
					</span>
					<span
						class="text-muted-foreground mt-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-50"
					>
						{unit.label}
					</span>
				</div>
			{/each}
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
