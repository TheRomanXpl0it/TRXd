<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';

	let {
		status = 404
	}: {
		status?: number;
		message?: string;
	} = $props();

	const is404 = $derived(status === 404);
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center select-none">
	<h1 class="text-foreground/90 font-mono text-8xl font-black tracking-tighter sm:text-9xl">
		{status}
	</h1>

	<h2 class="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
		{is404 ? 'Page not found' : 'Something went wrong'}
	</h2>

	<div class="mt-8 flex flex-wrap items-center justify-center gap-4">
		<a
			href="/challenges"
			class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-semibold transition-colors"
		>
			View Challenges
		</a>
		<a
			href="/"
			class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-6 py-3 font-semibold transition-colors"
		>
			Back to Home
		</a>
		<button
			type="button"
			onclick={() => history.back()}
			class="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
		>
			<ArrowLeft class="h-4 w-4" />
			Go Back
		</button>
	</div>
</div>
