<script lang="ts">
	import { mode } from 'mode-watcher';

	interface CategoryTotal {
		category: string;
		count: number;
	}

	interface Props {
		solves?: any[];
		totalChallenges?: CategoryTotal[];
	}

	interface RadarItem {
		label: string;
		value: number;
	}

	interface RadarHover {
		item: RadarItem;
		x: number;
		y: number;
	}

	const size = 350;
	const center = size / 2;
	const radius = 110;
	const gridLevels = [1, 0.8, 0.6, 0.4, 0.2];

	let { solves = [], totalChallenges = [] }: Props = $props();
	let hovered = $state<RadarHover | null>(null);

	const isDark = $derived(mode.current === 'dark');
	const lineColor = $derived(isDark ? 'rgba(255, 255, 255, 0.76)' : 'rgba(15, 23, 42, 0.62)');
	const fillColor = $derived(isDark ? 'rgba(255, 255, 255, 0.32)' : 'rgba(15, 23, 42, 0.16)');
	const gridColor = $derived(isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.16)');
	const bandColor = $derived(isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(15, 23, 42, 0.035)');
	const labelColor = $derived(isDark ? 'rgba(255, 255, 255, 0.68)' : 'rgba(15, 23, 42, 0.62)');

	const chartItems = $derived.by<RadarItem[]>(() => {
		if (!totalChallenges || totalChallenges.length === 0) return [];

		const solveCounts: Record<string, number> = {};
		for (const solve of solves) {
			if (solve?.category) {
				solveCounts[solve.category] = (solveCounts[solve.category] || 0) + 1;
			}
		}

		return totalChallenges.map((total) => {
			const solved = solveCounts[total.category] || 0;
			const count = total.count || 1;

			return {
				label: total.category,
				value: Math.min(Math.round((solved / count) * 100), 100)
			};
		});
	});

	const dataPolygon = $derived(polygonFor(chartItems, 1));

	function pointFor(index: number, total: number, scale = 1) {
		const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;

		return {
			x: center + Math.cos(angle) * radius * scale,
			y: center + Math.sin(angle) * radius * scale
		};
	}

	function polygonFor(items: RadarItem[], scale: number) {
		return items
			.map((item, index) => {
				const point = pointFor(index, items.length, (item.value / 100) * scale);
				return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
			})
			.join(' ');
	}

	function gridPolygon(scale: number, count: number) {
		return Array.from({ length: count }, (_, index) => {
			const point = pointFor(index, count, scale);
			return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
		}).join(' ');
	}

	function textAnchor(x: number) {
		if (x < center - 12) return 'end';
		if (x > center + 12) return 'start';
		return 'middle';
	}

	function shortLabel(label: string) {
		return label.length > 16 ? `${label.slice(0, 15)}...` : label;
	}

	function tooltipLeft(hover: RadarHover) {
		return Math.min(Math.max((hover.x / size) * 100, 12), 88);
	}

	function tooltipTop(hover: RadarHover) {
		return Math.min(Math.max((hover.y / size) * 100, 12), 88);
	}
</script>

<div class="flex min-h-[350px] w-full items-center justify-center p-4">
	{#if chartItems.length > 0}
		<div class="relative h-[350px] w-full max-w-[390px]">
			<svg
				class="h-full w-full overflow-visible"
				viewBox={`0 0 ${size} ${size}`}
				role="img"
				aria-label="Category completion radar chart"
				onpointerleave={() => (hovered = null)}
			>
				{#each gridLevels as level, index}
					<polygon
						points={gridPolygon(level, chartItems.length)}
						fill={index % 2 === 0 ? 'transparent' : bandColor}
						stroke={gridColor}
						stroke-width="1"
					/>
				{/each}

				{#each chartItems as item, index}
					{@const outer = pointFor(index, chartItems.length)}
					{@const label = pointFor(index, chartItems.length, 1.22)}
					<line
						x1={center}
						y1={center}
						x2={outer.x}
						y2={outer.y}
						stroke={gridColor}
						stroke-width="1"
						opacity="0.75"
					/>
					<text
						x={label.x}
						y={label.y}
						fill={labelColor}
						text-anchor={textAnchor(label.x)}
						dominant-baseline="middle"
						font-size="11"
						font-weight="800"
						letter-spacing="0"
					>
						{shortLabel(item.label)}
					</text>
				{/each}

				<polygon
					points={dataPolygon}
					fill={fillColor}
					stroke={lineColor}
					stroke-width="2"
					stroke-linejoin="round"
					filter="drop-shadow(1px 1px 4px rgba(0, 0, 0, 0.22))"
				/>

				{#each chartItems as item, index}
					{@const point = pointFor(index, chartItems.length, item.value / 100)}
					<g
						role="img"
						aria-label={`${item.label}: ${item.value}%`}
						onpointerenter={() => (hovered = { item, x: point.x, y: point.y })}
						onpointermove={() => (hovered = { item, x: point.x, y: point.y })}
					>
						<circle cx={point.x} cy={point.y} r="12" fill="transparent" />
						<circle
							cx={point.x}
							cy={point.y}
							r="4"
							fill={isDark ? '#fff' : 'rgba(15, 23, 42, 0.82)'}
							stroke={lineColor}
							stroke-width="2"
						>
							<title>{item.label}: {item.value}%</title>
						</circle>
					</g>
				{/each}
			</svg>

			{#if hovered}
				<div
					class="bg-muted text-foreground border-border pointer-events-none absolute z-50 min-w-[120px] rounded-lg border px-3 py-2 text-xs shadow-xl"
					style={`left: ${tooltipLeft(hovered)}%; top: ${tooltipTop(hovered)}%; transform: translate(-50%, -125%);`}
				>
					<div class="text-muted-foreground mb-1 font-bold uppercase tracking-widest">
						{hovered.item.label}
					</div>
					<div class="font-mono text-base font-black">{hovered.item.value}%</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-muted-foreground font-mono text-xs uppercase tracking-widest opacity-50">
			The competition hasn't started yet
		</div>
	{/if}
</div>
