<script lang="ts">
	import DateTimePicker from '$lib/components/ui/date-time-picker.svelte';

	let { initialValue = '', invalid = false }: { initialValue?: string; invalid?: boolean } = $props();

	let value = $state(initialValue);
</script>

<DateTimePicker bind:value {invalid} />
<output data-testid="value">{value}</output>
