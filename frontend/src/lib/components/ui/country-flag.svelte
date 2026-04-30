<script lang="ts">
	const flags = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
		query: '?url',
		import: 'default'
	}) as Record<string, () => Promise<string>>;

	const normalizeCode = (iso2: string) => {
		const code = iso2?.trim().toUpperCase() ?? '';
		return /^[A-Z]{2}$/.test(code) ? code : '';
	};

	const cssSize = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

	let {
		country,
		class: className = '',
		width = 32,
		height = 32
	} = $props<{
		country: string;
		class?: string;
		width?: number | string;
		height?: number | string;
	}>();

	let flagUrl = $state('');
	let loadId = 0;

	const widthValue = $derived(cssSize(width));
	const heightValue = $derived(cssSize(height));
	const widthAttr = $derived(typeof width === 'number' ? width : undefined);
	const heightAttr = $derived(typeof height === 'number' ? height : undefined);
	const stringSizeStyle = $derived(
		typeof width === 'string' || typeof height === 'string'
			? `width: ${widthValue}; height: ${heightValue};`
			: undefined
	);
	const fallbackStyle = $derived(
		className ? undefined : `width: ${widthValue}; height: ${heightValue};`
	);

	$effect(() => {
		const code = normalizeCode(country);
		const loader = flags[`/node_modules/country-flag-icons/3x2/${code}.svg`];
		const currentLoad = ++loadId;
		flagUrl = '';

		if (!loader) return;

		loader().then((url) => {
			if (currentLoad === loadId) flagUrl = url;
		});
	});
</script>

{#if flagUrl}
	<img
		src={flagUrl}
		alt={`${country} flag`}
		class={className}
		width={widthAttr}
		height={heightAttr}
		style={stringSizeStyle}
	/>
{:else}
	<!-- Fallback for missing flags -->
	<div class={`bg-muted ${className}`} style={fallbackStyle}></div>
{/if}
