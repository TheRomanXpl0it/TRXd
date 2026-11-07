<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		placeholder = 'Add tags...',
		value = $bindable<string[]>([]),
		id
	} = $props<{
		placeholder?: string;
		value?: string[];
		id?: string;
	}>();

	let inputVal = $state('');
	let inputEl: HTMLInputElement | null = null;

	const tags = $derived(Array.isArray(value) ? value : []);

	function remove(tag: string) {
		value = tags.filter((t) => t !== tag);
	}

	function addTag() {
		const raw = inputVal.trim();
		if (!raw) return;
		const newTags = raw
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
		const current = [...tags];
		for (const tag of newTags) {
			if (!current.includes(tag)) {
				current.push(tag);
			}
		}
		value = current;
		inputVal = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag();
			return;
		}
		if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
			remove(tags[tags.length - 1]);
		}
	}

	function onBlur() {
		if (inputVal.trim()) {
			addTag();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="border-input ring-offset-background placeholder:text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] flex min-h-9 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-3 py-1.5 text-sm font-medium outline-none transition-[color,box-shadow]"
	onclick={() => inputEl?.focus()}
	role="presentation"
>
	{#each tags as tag (tag)}
		<span
			class="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold"
		>
			{tag}
			<button
				type="button"
				class="text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
				onclick={(e) => {
					e.stopPropagation();
					remove(tag);
				}}
				aria-label={`Remove ${tag}`}
				title={`Remove ${tag}`}
			>
				<X class="h-3 w-3" />
			</button>
		</span>
	{/each}

	<input
		{id}
		bind:this={inputEl}
		bind:value={inputVal}
		placeholder={tags.length === 0 ? placeholder : ''}
		autocomplete="off"
		onkeydown={onKeydown}
		onblur={onBlur}
		class="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
	/>
</div>
