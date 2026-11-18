<script lang="ts">
	import SolvesTable from '$lib/components/SolvesTable.svelte';

	let { team }: { team: any } = $props();
</script>

<SolvesTable
	solves={Array.isArray(team?.solves) ? team.solves : []}
	members={Array.isArray(team?.members) ? team.members : []}
/>
