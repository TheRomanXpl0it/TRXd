<script lang="ts">
	let {
		challenge,
		countdown = 0,
		onclick
	}: {
		challenge: any;
		countdown?: number;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	class="relative flex min-h-[136px] w-full cursor-pointer flex-col overflow-hidden rounded-[10px] p-5 text-left shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 {challenge.solved
		? 'bg-emerald-500/30 dark:bg-emerald-600/40'
		: 'border border-transparent bg-[#fafafa] dark:bg-zinc-900'}"
	{onclick}
	aria-label="View details for {challenge.name}"
>
	<!-- Title -->
	<h3
		class="mb-2 w-full truncate text-[18px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100"
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
