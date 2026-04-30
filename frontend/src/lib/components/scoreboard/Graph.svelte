<script lang="ts">
	import { mode } from 'mode-watcher';

	interface Props {
		data?: any[];
		timeMin?: string | number | Date | null;
		timeMax?: string | number | Date | null;
		userMode?: boolean;
		compact?: boolean;
		height?: string;
	}

	interface SolveDatum {
		points: number;
		date: Date;
	}

	interface ChartPoint {
		date: Date;
		value: number;
		name: string;
		color: string;
	}

	interface ChartSeries {
		id: string | number;
		name: string;
		data: ChartPoint[];
		color: string;
	}

	interface RenderedSeries extends ChartSeries {
		path: string;
	}

	interface HoverState {
		point: ChartPoint;
		x: number;
		y: number;
		cursorX: number;
		cursorY: number;
	}

	let {
		data = [],
		timeMin,
		timeMax,
		userMode: _userMode = false,
		compact = false,
		height = ''
	}: Props = $props();

	let highlightedTeam = $state<string | number | null>(null);
	let containerWidth = $state(1000);
	let hovered = $state<HoverState | null>(null);

	const isDark = $derived(mode.current === 'dark');
	const endLimitMs = $derived(toDate(timeMax)?.getTime() ?? Infinity);
	const chartHeightSetting = $derived(compact ? 280 : 320);
	const chartTop = $derived(compact ? 10 : 14);
	const chartBottom = $derived(chartHeightSetting - (compact ? 24 : 30));
	const chartLeft = $derived(compact ? 52 : 68);
	const chartRight = $derived(Math.max(chartLeft + 120, containerWidth - (compact ? 12 : 18)));
	const chartWidth = $derived(chartRight - chartLeft);
	const plotHeight = $derived(chartBottom - chartTop);

	function toDate(t: unknown): Date | null {
		if (t instanceof Date) return t;

		if (typeof t === 'number') {
			return new Date(t < 2_000_000_000 ? t * 1000 : t);
		}

		if (typeof t !== 'string') return null;

		// Truncate excessive fractional seconds for safer Date parsing
		const fixed = t.replace(/\.(\d{3})\d*(Z|[+\-]\d\d:\d\d)$/, '.$1$2');
		const d = new Date(fixed);

		return Number.isNaN(d.getTime()) ? null : d;
	}

	function normalizeTeam(entry: any): SolveDatum[] {
		if (!entry) return [];

		if (Array.isArray(entry.submissions)) {
			return entry.submissions
				.map((s: any) => ({
					points: Number(s?.score ?? 0),
					date: toDate(s?.timestamp)
				}))
				.filter(
					(s: { points: number; date: Date | null }): s is SolveDatum =>
						s.date !== null && s.date.getTime() <= endLimitMs
				);
		}

		if (Array.isArray(entry.solves)) {
			return entry.solves
				.map((s: any) => ({
					points: Number(s?.[1] ?? 0),
					date: toDate(s?.[2])
				}))
				.filter(
					(s: { points: number; date: Date | null }): s is SolveDatum =>
						s.date !== null && s.date.getTime() <= endLimitMs
				);
		}

		return [];
	}

	function nameForTeam(team: any): string {
		if (team?.team_name) return team.team_name;
		if (team?.name) return team.name;
		return String(team?.team_id ?? team?.id ?? '');
	}

	const top3Colors = ['#fbbf24', '#94a3b8', '#cd7f32'];
	const colors = [
		'#3b82f6',
		'#ef4444',
		'#10b981',
		'#f59e0b',
		'#8b5cf6',
		'#06b6d4',
		'#f97316',
		'#84cc16',
		'#ec4899',
		'#6366f1'
	];

	const chartData = $derived.by<ChartSeries[]>(() => {
		const arr = Array.isArray(data) ? data : [];
		if (arr.length === 0) return [];

		const now = new Date();

		const processedTeams = arr.map((team: any) => {
			const solves = normalizeTeam(team).sort((a, b) => a.date.getTime() - b.date.getTime());

			const total = solves.length > 0 ? solves[solves.length - 1].points : 0;
			const lastSolve = solves.length > 0 ? solves[solves.length - 1].date.getTime() : 0;

			return {
				...team,
				id: team?.team_id ?? team?.id ?? nameForTeam(team),
				name: nameForTeam(team),
				solves,
				total,
				lastSolve
			};
		});

		const ranked = processedTeams
			.filter((team) => team.total > 0)
			.sort(
				(a, b) =>
					b.total - a.total || a.lastSolve - b.lastSolve || Number(a.id ?? 0) - Number(b.id ?? 0)
			);

		const limitDate = toDate(timeMax);
		const graphEndDate = limitDate && now.getTime() > limitDate.getTime() ? limitDate : now;

		return ranked.map((team, index) => {
			const color = index < 3 ? top3Colors[index] : colors[(index - 3) % colors.length];
			const firstSolve = team.solves[0];
			const lastSolve = team.solves[team.solves.length - 1];

			const points: ChartPoint[] = new Array(team.solves.length + 2);

			points[0] = {
				date: firstSolve.date,
				value: 0,
				name: team.name,
				color
			};

			for (let i = 0; i < team.solves.length; i++) {
				const solve = team.solves[i];
				points[i + 1] = {
					date: solve.date,
					value: solve.points,
					name: team.name,
					color
				};
			}

			points[points.length - 1] = {
				date: graphEndDate,
				value: lastSolve.points,
				name: team.name,
				color
			};

			return {
				id: team.id,
				name: team.name,
				data: points,
				color
			};
		});
	});

	const flatChartData = $derived.by<ChartPoint[]>(() => {
		const flat = chartData.flatMap((series) => series.data);
		flat.sort((a, b) => a.date.getTime() - b.date.getTime());
		return flat;
	});

	const timeDomain = $derived.by(() => {
		const configuredMin = toDate(timeMin);
		const configuredMax = toDate(timeMax);
		const fallbackStart = flatChartData[0]?.date ?? new Date();
		const fallbackEnd = flatChartData[flatChartData.length - 1]?.date ?? fallbackStart;
		const start = configuredMin ?? fallbackStart;
		let end = configuredMax ?? fallbackEnd;

		if (end.getTime() <= start.getTime()) {
			end = new Date(start.getTime() + 60_000);
		}

		return {
			start,
			end,
			span: end.getTime() - start.getTime()
		};
	});

	const maxScore = $derived.by(() => {
		let max = 0;
		for (const series of chartData) {
			for (const point of series.data) {
				if (point.value > max) max = point.value;
			}
		}
		return Math.max(max, 1);
	});

	const yTicks = $derived.by(() => makeTicks(maxScore, compact ? 3 : 4));
	const yMax = $derived(yTicks[yTicks.length - 1] ?? maxScore);

	const renderedSeries = $derived.by<RenderedSeries[]>(() =>
		chartData.map((series) => ({
			...series,
			path: stepPath(series.data)
		}))
	);

	const legendData = $derived(
		renderedSeries.map((series) => ({
			id: series.id,
			name: series.name,
			color: series.color,
			lastScore: series.data.length > 0 ? series.data[series.data.length - 1].value : 0
		}))
	);

	const textColor = $derived('var(--muted-foreground)');
	const gridColor = $derived('var(--border)');
	const clipPathId = 'score-history-clip';

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function niceNumber(value: number) {
		const exponent = Math.floor(Math.log10(value));
		const fraction = value / Math.pow(10, exponent);
		const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
		return niceFraction * Math.pow(10, exponent);
	}

	function makeTicks(max: number, count: number) {
		const step = niceNumber(Math.max(max, 1) / Math.max(count - 1, 1));
		const roundedTop = Math.max(step, Math.ceil(max / step) * step);
		const ticks: number[] = [];

		for (let value = 0; value <= roundedTop + step / 2; value += step) {
			ticks.push(Math.round(value));
		}

		return ticks;
	}

	function xFor(date: Date) {
		const offset = (date.getTime() - timeDomain.start.getTime()) / timeDomain.span;
		return chartLeft + offset * chartWidth;
	}

	function yFor(value: number) {
		return chartBottom - (value / yMax) * plotHeight;
	}

	function stepPath(points: ChartPoint[]) {
		if (points.length === 0) return '';

		const first = points[0];
		let x = clamp(xFor(first.date), chartLeft - 4, chartRight + 4);
		let y = yFor(first.value);
		let path = `M ${x.toFixed(2)} ${y.toFixed(2)}`;

		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			x = clamp(xFor(point.date), chartLeft - 4, chartRight + 4);
			y = yFor(point.value);
			path += ` H ${x.toFixed(2)} V ${y.toFixed(2)}`;
		}

		return path;
	}

	function formatScore(value: number) {
		return value.toLocaleString('en-GB');
	}

	function formatDate(date: Date) {
		return date.toLocaleString([], {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function tooltipLeft(hover: HoverState) {
		return clamp((hover.cursorX / containerWidth) * 100, 10, 90);
	}

	function tooltipTop(hover: HoverState) {
		return clamp((hover.cursorY / chartHeightSetting) * 100, 16, 84);
	}

	function handlePointerMove(event: PointerEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * containerWidth;
		const y = ((event.clientY - rect.top) / rect.height) * chartHeightSetting;

		if (x < chartLeft || x > chartRight || y < chartTop || y > chartBottom) {
			hovered = null;
			return;
		}

		const targetTime =
			timeDomain.start.getTime() + ((x - chartLeft) / chartWidth) * timeDomain.span;
		const source =
			highlightedTeam === null
				? flatChartData
				: (chartData.find((series) => series.id === highlightedTeam)?.data ?? flatChartData);

		let point: ChartPoint | null = null;
		let bestDistance = Infinity;

		for (const candidate of source) {
			const distance = Math.abs(candidate.date.getTime() - targetTime);
			if (distance < bestDistance) {
				bestDistance = distance;
				point = candidate;
			}
		}

		hovered = point
			? {
					point,
					x: clamp(xFor(point.date), chartLeft, chartRight),
					y: yFor(point.value),
					cursorX: x,
					cursorY: y
				}
			: null;
	}

	function handlePointerLeave() {
		hovered = null;
	}
</script>

<div class="flex w-full flex-col">
	<div
		bind:clientWidth={containerWidth}
		class="relative w-full"
		style={height ? `height: ${height}` : `height: ${compact ? '280px' : '320px'}`}
	>
		{#if renderedSeries.length > 0}
			{#key isDark}
				<svg
					class="h-full w-full select-none"
					viewBox={`0 0 ${containerWidth} ${chartHeightSetting}`}
					role="img"
					aria-label="Score history"
					onpointermove={handlePointerMove}
					onpointerleave={handlePointerLeave}
				>
					<defs>
						<clipPath id={clipPathId}>
							<rect x={chartLeft} y={chartTop} width={chartWidth} height={plotHeight} />
						</clipPath>
					</defs>

					<rect width={containerWidth} height={chartHeightSetting} fill="transparent" />

					{#each yTicks as tick}
						{@const y = yFor(tick)}
						<line
							x1={chartLeft}
							x2={chartRight}
							y1={y}
							y2={y}
							stroke={gridColor}
							stroke-dasharray="4"
						/>
						<text
							x={chartLeft - 8}
							y={y + 4}
							fill={textColor}
							text-anchor="end"
							font-size={compact ? 9 : 11}
							font-weight="700"
						>
							{formatScore(tick)}
						</text>
					{/each}

					<g clip-path={`url(#${clipPathId})`}>
						{#each renderedSeries as series (series.id)}
							<path
								d={series.path}
								fill="none"
								stroke={series.color}
								stroke-width="3"
								stroke-linejoin="round"
								stroke-linecap="round"
								vector-effect="non-scaling-stroke"
								opacity={highlightedTeam === null || highlightedTeam === series.id ? 1 : 0.12}
							/>
						{/each}
					</g>

					{#if hovered}
						<line
							x1={hovered.x}
							x2={hovered.x}
							y1={chartTop}
							y2={chartBottom}
							stroke={textColor}
							opacity="0.28"
							vector-effect="non-scaling-stroke"
						/>
						<circle
							cx={hovered.x}
							cy={hovered.y}
							r={compact ? 4 : 5}
							fill={hovered.point.color}
							stroke="var(--background)"
							stroke-width="2"
							vector-effect="non-scaling-stroke"
						/>
					{/if}
				</svg>

				{#if hovered}
					<div
						class="bg-card/95 text-card-foreground border-muted/30 pointer-events-none absolute z-50 min-w-[150px] rounded-lg border p-3 text-sm shadow-xl backdrop-blur-sm"
						style={`left: ${tooltipLeft(hovered)}%; top: ${tooltipTop(hovered)}%; transform: translate(-50%, -115%);`}
					>
						<div
							class="border-muted/50 text-muted-foreground mb-2 border-b pb-1.5 text-xs font-bold uppercase tracking-widest"
						>
							{formatDate(hovered.point.date)}
						</div>
						<div class="flex items-center gap-3">
							<div
								class="h-3 w-3 rounded-full shadow-sm"
								style="background-color: {hovered.point.color}"
							></div>
							<div
								class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold tracking-tight"
							>
								{hovered.point.name}
							</div>
							<div class="ml-auto font-mono text-base font-black">{hovered.point.value}</div>
						</div>
					</div>
				{/if}
			{/key}
		{:else}
			<div
				class="text-muted-foreground flex h-full items-center justify-center font-mono text-sm uppercase tracking-widest"
			>
				No graph data visible
			</div>
		{/if}
	</div>

	{#if legendData.length > 0 && !compact}
		<div
			class="custom-scrollbar mt-6 max-h-[120px] overflow-y-auto px-4 sm:max-h-none sm:px-6"
			style="content-visibility: auto; contain-intrinsic-size: 120px;"
		>
			<div class="flex flex-wrap justify-center gap-3 py-1 text-sm sm:gap-4">
				{#each legendData as series (series.id)}
					<button
						type="button"
						class="hover:bg-muted/50 focus:ring-primary/30 group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-all duration-200 focus:outline-none focus:ring-2 {highlightedTeam !==
							null && highlightedTeam !== series.id
							? 'opacity-30 grayscale-[50%]'
							: 'opacity-100'}"
						title="{series.name}: {series.lastScore} pts"
						onclick={() => {
							highlightedTeam = highlightedTeam === series.id ? null : series.id;
						}}
					>
						<div
							class="h-3 w-3 rounded-full shadow-md transition-transform duration-200 sm:h-4 sm:w-4 {highlightedTeam ===
							series.id
								? 'scale-125 border-2 border-white'
								: ''}"
							style="background-color: {series.color};"
						></div>
						<span class="text-foreground text-xs font-bold tracking-tight sm:text-sm">
							{series.name}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.2);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.4);
	}
</style>
