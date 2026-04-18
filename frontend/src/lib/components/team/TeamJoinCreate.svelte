<script lang="ts">
	import { Users, ShieldPlus, ArrowRight } from '@lucide/svelte';
</script>

<div class="my-10 grid w-full gap-6 md:grid-cols-2 lg:gap-8 xl:max-w-6xl">
	<!-- Join card -->
	<a
		href="/team/join"
		aria-label="Join Team"
		class="group relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-transparent bg-card text-left transition-all duration-300 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		<div class="flex flex-1 flex-col items-center justify-center p-8 text-center sm:p-12">
			<div class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300">
				<Users strokeWidth={1.5} class="h-10 w-10" />
			</div>
			
			<h2 class="mb-6 text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">Join Existing Team</h2>
			
			<div class="mt-auto flex items-center text-sm font-bold uppercase tracking-wider text-primary">
				<span>Join</span>
				<ArrowRight class="ml-2 h-4 w-4 transition-transform duration-300" />
			</div>
		</div>
	</a>

	<!-- Create card -->
	<a
		href="/team/create"
		aria-label="Create Team"
		class="group relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-transparent bg-card text-left transition-all duration-300 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		<div class="flex flex-1 flex-col items-center justify-center p-8 text-center sm:p-12">
			<div class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300">
				<ShieldPlus strokeWidth={1.5} class="h-10 w-10" />
			</div>
			
			<h2 class="mb-6 text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">Create New Team</h2>
			
			<div class="mt-auto flex items-center text-sm font-bold uppercase tracking-wider text-primary">
				<span>Create</span>
				<ArrowRight class="ml-2 h-4 w-4 transition-transform duration-300" />
			</div>
		</div>
	</a>
</div>
