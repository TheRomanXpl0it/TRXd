<script lang="ts">
	import { ArrowLeft, WifiOff } from '@lucide/svelte';

	let {
		status = 404,
		message,
		isConnectionError = false
	}: {
		status?: number;
		message?: string;
		isConnectionError?: boolean;
	} = $props();

	const is404 = $derived(status === 404);
	const cleanMessage = $derived(message === 'Internal Error' ? '' : message);
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center select-none">
	{#if isConnectionError}
		<div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
			<WifiOff class="h-12 w-12 opacity-60" />
		</div>

		<h1 class="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
			Connection error
		</h1>

		<p class="text-muted-foreground mt-3 max-w-md text-base leading-relaxed">
			{cleanMessage || 'Unable to connect to the server. Please check your connection and try again.'}
		</p>
	{:else}
		<h1 class="text-foreground/90 font-mono text-8xl font-black tracking-tighter sm:text-9xl">
			{status}
		</h1>

		<h2 class="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
			{is404 ? 'Page not found' : 'Something went wrong'}
		</h2>

		{#if cleanMessage && !is404}
			<p class="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">{cleanMessage}</p>
		{/if}
	{/if}

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
