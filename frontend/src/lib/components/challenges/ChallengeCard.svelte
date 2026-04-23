<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { EyeOff, Clock } from '@lucide/svelte';
	import { fmtTimeLeft } from '$lib/utils/time';

	let {
		challenge,
		countdown = 0,
		onclick
	}: {
		challenge: any;
		countdown?: number;
		onclick: () => void;
	} = $props();

	const isPrivileged = $derived(
		authState.user?.role === 'Admin' || authState.user?.role === 'Author'
	);
</script>

<button
	type="button"
	class="relative flex min-h-[136px] w-full cursor-pointer flex-col overflow-hidden rounded-[10px] border-2 border-transparent p-5 text-left shadow-md transition-all duration-300 hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:border-zinc-800 {challenge.solved
		? 'solve-surface'
		: 'bg-[#fafafa] dark:bg-zinc-900'} {challenge.hidden && isPrivileged ? 'opacity-75' : ''}"
	{onclick}
	aria-label="View details for {challenge.name}"
>
	<div class="mb-2 flex items-start justify-between gap-4">
		<h3
			class="min-w-0 truncate text-[18px] font-black leading-snug tracking-tighter text-zinc-900 dark:text-zinc-100"
		>
			{challenge.name}
		</h3>

		<div class="flex shrink-0 items-center gap-2 pt-1">
			{#if countdown > 0}
				<div
					class="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-emerald-500 dark:bg-emerald-500/20"
				>
					<Clock class="h-3 w-3" />
					{fmtTimeLeft(countdown)}
				</div>
			{/if}
			{#if challenge.hidden && isPrivileged}
				<div
					class="flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-400/10 dark:text-zinc-400"
				>
					<EyeOff class="h-3 w-3" />
					Hidden
				</div>
			{/if}
		</div>
	</div>

	<!-- Tags -->
	{#if challenge.tags && challenge.tags.length > 0}
		<div class="mb-4 flex flex-wrap gap-1.5">
			{#each challenge.tags as tag}
				<span
					class="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
				>
					{tag}
				</span>
			{/each}
		</div>
	{:else}
		<div class="mb-4"></div>
	{/if}

	<!-- Points / Footer -->
	<div class="mt-auto flex items-center justify-between">
		<span class="text-[14px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-300">
			{challenge.points} pts
		</span>
		{#if challenge.solves !== undefined}
			<span class="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
				{challenge.solves} Solves
			</span>
		{/if}
	</div>
</button>
