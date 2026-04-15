<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/settings/profile');
	});
</script>

<div class="flex h-[70vh] items-center justify-center">
	<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
</div>
