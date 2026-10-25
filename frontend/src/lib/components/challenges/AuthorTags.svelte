<script lang="ts">
	import { LockKeyhole } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth';

	let { tags = [] }: { tags?: string[] } = $props();
	const isAuthor = $derived(authState.user?.role === 'Author' || authState.user?.role === 'Admin');
</script>

{#if isAuthor && tags.length > 0}
	<div role="list" aria-label="Author-only tags" class="flex flex-wrap items-center gap-1.5">
		{#each tags as tag}
			<span
				role="listitem"
				title="Author-only tag"
				class="bg-muted text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
			>
				<LockKeyhole class="h-3 w-3 shrink-0" aria-hidden="true" />
				<span class="break-all">{tag}</span>
			</span>
		{/each}
	</div>
{/if}
