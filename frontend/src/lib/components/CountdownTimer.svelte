<script lang="ts">
	import { Clock } from '@lucide/svelte';

	let { endTime, label = '' }: { endTime: string | null; label?: string } = $props();

	let timeLeft = $state(0);
	let isRunning = $state(false);

	$effect(() => {
		const target = endTime ? new Date(endTime).getTime() : NaN;
		if (!endTime || Number.isNaN(target)) {
			timeLeft = 0;
			isRunning = false;
			return;
		}

		const update = () => {
			const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
			timeLeft = remaining;
			isRunning = remaining > 0;
			return remaining > 0;
		};

		if (!update()) return;

		const interval = setInterval(() => {
			if (!update()) clearInterval(interval);
		}, 1000);

		return () => clearInterval(interval);
	});

	function formatTime(seconds: number) {
		const days = Math.floor(seconds / (3600 * 24));
		const hours = Math.floor((seconds % (3600 * 24)) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		const parts = [];
		if (days > 0) parts.push(`${days}d`);
		if (hours > 0 || days > 0) parts.push(`${hours}h`);
		parts.push(`${minutes}m`);
		parts.push(`${secs}s`);

		return parts.join(' ');
	}
</script>

{#if endTime && isRunning}
	<div
		class="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary"
		title="Time remaining until event ends"
	>
		<Clock class="h-4 w-4" />
		<div class="flex items-center gap-1.5 text-sm font-bold">
			{#if label}
				<span class="opacity-70 uppercase tracking-tight">{label}</span>
			{/if}
			<span class="font-mono tabular-nums">
				{formatTime(timeLeft)}
			</span>
		</div>
	</div>
{/if}
