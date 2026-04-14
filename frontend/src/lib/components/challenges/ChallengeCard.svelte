<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { EyeOff } from '@lucide/svelte';

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
	class="relative flex min-h-[136px] w-full cursor-pointer flex-col overflow-hidden rounded-[10px] p-5 text-left shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 {challenge.solved
		? 'bg-[#05100a] dark:bg-[#05100a]'
		: 'border border-transparent bg-[#fafafa] dark:bg-zinc-900'} {challenge.hidden && isPrivileged ? 'opacity-75' : ''}"
	{onclick}
	aria-label="View details for {challenge.name}"
>
	{#if challenge.hidden && isPrivileged}
		<div
			class="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-400/10 dark:text-zinc-400"
		>
			<EyeOff class="h-3 w-3" />
			Hidden
		</div>
	{/if}

	<!-- Title -->
	<h3
		class="mb-2 w-full truncate pr-16 text-[18px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100"
	>
		{challenge.name}
	</h3>

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
