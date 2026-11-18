<script lang="ts">
	import SolvesTable from '$lib/components/SolvesTable.svelte';

	let { solves }: { solves: any[] | undefined } = $props();
</script>

<SolvesTable solves={Array.isArray(solves) ? solves : []} />
