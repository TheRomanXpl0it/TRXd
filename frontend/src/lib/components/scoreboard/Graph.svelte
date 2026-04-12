<script lang="ts">
	import { Chart, Svg, Axis, Spline, Highlight, Tooltip as ChartTooltip } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
	// @ts-ignore - Ignore missing type declarations for d3-shape
	import { curveStepAfter } from 'd3-shape';
	import { mode } from 'mode-watcher';

	// Props interface
	interface Props {
		data?: any[];
		timeMin?: number;
		timeMax?: number;
		userMode?: boolean;
		compact?: boolean;
		height?: string;
	}

	let {
		data = [],
		timeMin,
		timeMax,
		userMode = false,
		compact = false,
		height = ''
	}: Props = $props();

	const isDark = $derived(mode.current === 'dark');

	// Parse ISO timestamps to Date
	function toDate(t: any): Date | null {
		if (t instanceof Date) return t;
		if (typeof t === 'number') {
			return new Date(t < 2_000_000_000 ? t * 1000 : t);
		}
		if (typeof t !== 'string') return null;
		const fixed = t.replace(/\.(\d{3})\d*(Z|[+\-]\d\d:\d\d)$/, '.$1$2');
		const d = new Date(fixed);
		return isNaN(d.getTime()) ? null : d;
	}

	function normalizeTeam(entry: any): any[] {
		if (!entry) return [];
		if (Array.isArray(entry.submissions)) {
			return entry.submissions.map((s: any) => ({
				points: Number(s?.score ?? 0),
				date: toDate(s?.timestamp),
				fb: !!s?.first_blood
			}));
		}
		if (Array.isArray(entry.solves)) {
			return entry.solves.map((s: any) => ({
				points: Number(s?.[1] ?? 0),
				date: toDate(s?.[2]),
				fb: !!s?.[3]
			}));
		}
		return [];
	}

	function totalPoints(entry: any): number {
		const solves = normalizeTeam(entry);
		if (solves.length === 0) return 0;
		return Math.max(...solves.map((s) => Number(s?.points ?? 0)));
	}

	function nameForTeam(team: any): string {
		if (team?.team_name) return team.team_name;
		if (team?.name) return team.name;
		return String(team?.team_id || team?.id || '');
	}

	// Competitive colors for top 3
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

	const chartData = $derived.by(() => {
		const arr = Array.isArray(data) ? data : [];

		const ranked = [...arr]
			.map((e: any) => {
				const solves = normalizeTeam(e);
				const total =
					solves.length > 0 ? Math.max(...solves.map((s) => Number(s?.points ?? 0))) : 0;
				const lastSolve =
					solves.length > 0 ? Math.max(...solves.map((s) => s.date?.getTime() || 0)) : 0;
				return { ...e, total, lastSolve };
			})
			.sort(
				(a: any, b: any) =>
					b.total - a.total ||
					a.lastSolve - b.lastSolve ||
					(a.id || a.team_id || 0) - (b.id || b.team_id || 0)
			);

		let minTime = Date.now();
		let hasData = false;
		ranked.forEach((team: any) => {
			const solves = normalizeTeam(team).filter((s: any) => s.date !== null);
			if (solves.length > 0 && solves[0].date) {
				hasData = true;
				minTime = Math.min(minTime, solves[0].date.getTime() - 60000);
			}
		});

		const nowMs = Date.now();

		const series: Array<{
			id: string | number;
			name: string;
			data: Array<{ date: Date; value: number; name?: string; color?: string }>;
			color: string;
		}> = [];

		ranked.forEach((team: any, index: number) => {
			if (team.total === 0) return;

			const name = nameForTeam(team);
			const color = index < 3 ? top3Colors[index] : colors[(index - 3) % colors.length];
			const solves = normalizeTeam(team)
				.filter((s: any) => s.date !== null)
				.sort((a: any, b: any) => a.date!.getTime() - b.date!.getTime());

			if (solves.length === 0) return;

			// Use only actual solve data points — step function via curveStepAfter
			const points: Array<{ date: Date; value: number; name: string; color: string }> = [];

			// Start from 0 at the first solve time (to show the jump)
			if (solves.length > 0) {
				points.push({
					date: solves[0].date,
					value: 0,
					name,
					color
				});
			}

			for (const s of solves) {
				points.push({
					date: s.date,
					value: Number(s.points ?? 0),
					name,
					color
				});
			}

			// Extend to now
			points.push({
				date: new Date(nowMs),
				value: points.length > 0 ? points[points.length - 1].value : 0,
				name,
				color
			});

			series.push({ id: team.team_id || team.id, name, data: points, color });
		});

		return series;
	});

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
					data={chartData.flatMap((s) => s.data)}
					x="date"
					xScale={scaleTime()}
					y="value"
					yScale={scaleLinear()}
					yDomain={[0, null]}
					padding={{
						left: compact ? 16 : 24,
						bottom: 8,
						top: compact ? 8 : 12,
						right: compact ? 8 : 12
					}}
					tooltip={{ mode: 'voronoi' }}
				>
					<Svg>
						<Axis
							placement="left"
							grid={{ style: `stroke: ${gridColor}; stroke-dasharray: 4` }}
							rule={{
								style: `font-size: ${compact ? '9px' : '11px'}; fill: ${textColor}; font-weight: bold;`
							}}
						/>
						{#each chartData as series}
							<Spline
								data={series.data}
								class="stroke-[3px] transition-all duration-300"
								style={`stroke: ${series.color}; opacity: ${highlightedTeam === null || highlightedTeam === series.id ? 1 : 0.1};`}
								curve={curveStepAfter}
							/>
						{/each}
						<Highlight lines points={{ r: 6 }} />
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

	<!-- Legend at bottom -->
	{#if chartData.length > 0 && !compact}
		<div class="custom-scrollbar mt-6 max-h-[120px] overflow-y-auto px-4 sm:max-h-none sm:px-6">
			<div class="flex flex-wrap justify-center gap-3 py-1 text-sm sm:gap-4">
				{#each chartData as series}
					{@const lastScore =
						series.data.length > 0 ? series.data[series.data.length - 1].value : 0}
					<button
						type="button"
						class="hover:bg-muted/50 focus:ring-primary/30 group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-all duration-200 focus:outline-none focus:ring-2 {highlightedTeam !==
							null && highlightedTeam !== series.id
							? 'opacity-30 grayscale-[50%]'
							: 'opacity-100'}"
						title="{series.name}: {lastScore} pts"
						onclick={() => {
							if (highlightedTeam === series.id) {
								highlightedTeam = null;
							} else {
								highlightedTeam = series.id;
							}
						}}
					>
						<div
							class="h-3 w-3 rounded-full shadow-md transition-transform duration-200 sm:h-4 sm:w-4 {highlightedTeam ===
							series.id
								? 'scale-125 border-2 border-white'
								: ''}"
							style="background-color: {series.color};"
						></div>
						<span class="text-foreground text-xs font-bold tracking-tight sm:text-sm"
							>{series.name}</span
						>
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
