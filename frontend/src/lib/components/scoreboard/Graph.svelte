<script lang="ts">
	import { Chart, Canvas, Svg, Axis, Spline, Highlight, Tooltip as ChartTooltip } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
	// @ts-ignore - Ignore missing type declarations for d3-shape
	import { curveStepAfter } from 'd3-shape';
	import { mode } from 'mode-watcher';

	interface Props {
		data?: any[];
		timeMin?: number;
		timeMax?: number;
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

	let {
		data = [],
		timeMin,
		timeMax,
		userMode: _userMode = false,
		compact = false,
		height = ''
	}: Props = $props();

	const xScale = scaleTime();
	const yScale = scaleLinear();

	const isDark = $derived(mode.current === 'dark');

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
				.filter((s: { points: number; date: Date | null }): s is SolveDatum => s.date !== null);
		}

		if (Array.isArray(entry.solves)) {
			return entry.solves
				.map((s: any) => ({
					points: Number(s?.[1] ?? 0),
					date: toDate(s?.[2])
				}))
				.filter((s: { points: number; date: Date | null }): s is SolveDatum => s.date !== null);
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

	let highlightedTeam = $state<string | number | null>(null);

	const xDomain = $derived.by(() => {
		const min = toDate(timeMin);
		const max = toDate(timeMax);
		return min || max ? [min, max] : undefined;
	});

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
				date: now,
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

	// bisect-x expects x-sorted data
	const flatChartData = $derived.by<ChartPoint[]>(() => {
		const flat = chartData.flatMap((series) => series.data);
		flat.sort((a, b) => a.date.getTime() - b.date.getTime());
		return flat;
	});

	const legendData = $derived(
		chartData.map((series) => ({
			id: series.id,
			name: series.name,
			color: series.color,
			lastScore: series.data.length > 0 ? series.data[series.data.length - 1].value : 0
		}))
	);

	const textColor = $derived('hsl(var(--muted-foreground))');
	const gridColor = $derived('hsl(var(--border))');
</script>

<div
	class="flex w-full flex-col"
	style={height ? `height: ${height}` : `height: ${compact ? '280px' : '380px'}`}
>
	<div class="w-full flex-grow">
		{#if chartData.length > 0}
			{#key isDark}
				<Chart
					data={flatChartData}
					x="date"
					{xScale}
					{xDomain}
					y="value"
					{yScale}
					yDomain={[0, null]}
					padding={{
						left: compact ? 16 : 24,
						bottom: 8,
						top: compact ? 8 : 12,
						right: compact ? 8 : 12
					}}
					tooltip={{ mode: 'bisect-x' }}
				>
					<!-- Use Svg for more reliable styling and theme isolation -->
					<Svg>
						<Axis
							placement="left"
							tickSpacing={compact ? 28 : 40}
							grid={{ style: `stroke: ${gridColor}; stroke-dasharray: 4` }}
							rule={{
								style: `font-size: ${compact ? '9px' : '11px'}; fill: ${textColor}; font-weight: bold;`
							}}
						/>
						
						{#each chartData as series (series.id)}
							<Spline
								data={series.data}
								curve={curveStepAfter}
								stroke={series.color}
								strokeWidth={3}
								fill="none"
								opacity={highlightedTeam === null || highlightedTeam === series.id ? 1 : 0.12}
							/>
						{/each}

						<Highlight lines points={{ r: compact ? 5 : 6 }} />
					</Svg>

					<ChartTooltip.Root
						class="bg-card/95 text-card-foreground border-muted/30 z-50 min-w-[150px] rounded-lg border p-3 text-sm shadow-xl backdrop-blur-sm"
					>
						{#snippet children({ data })}
							{@const active = Array.isArray(data) ? data[0] : data}
							{#if active && active.name}
								<div
									class="border-muted/50 text-muted-foreground mb-2 border-b pb-1.5 text-xs font-bold uppercase tracking-widest"
								>
									{active.date
										? new Date(active.date).toLocaleString([], {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
												hour12: false
											})
										: ''}
								</div>
								<div class="flex items-center gap-3">
									<div
										class="h-3 w-3 rounded-full shadow-sm"
										style="background-color: {active.color}"
									></div>
									<div
										class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold tracking-tight"
									>
										{active.name}
									</div>
									<div class="ml-auto font-mono text-base font-black">{active.value}</div>
								</div>
							{/if}
						{/snippet}
					</ChartTooltip.Root>
				</Chart>
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
