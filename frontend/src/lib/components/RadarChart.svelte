<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { mode } from 'mode-watcher';

	interface CategoryTotal {
		category: string;
		count: number;
	}

	interface Props {
		solves?: any[];
		totalChallenges?: CategoryTotal[];
	}

	let { solves = [], totalChallenges = [] }: Props = $props();

	let chartEl = $state<HTMLDivElement>();
	let chart = $state<any>();

	// Use mode-watcher's reactive state
	const isDark = $derived(mode.current === 'dark');

	// Process data for the radar chart
	const processedData = $derived.by(() => {
		if (!totalChallenges || totalChallenges.length === 0) return { labels: [], series: [] };

		const solveCounts: Record<string, number> = {};
		solves.forEach((s) => {
			if (s.category) {
				solveCounts[s.category] = (solveCounts[s.category] || 0) + 1;
			}
		});

		const labels = totalChallenges.map((tc) => tc.category);
		const seriesData = totalChallenges.map((tc) => {
			const count = solveCounts[tc.category] || 0;
			const total = tc.count || 1;
			return Math.round((count / total) * 100);
		});

		return { labels, series: seriesData };
	});

	// Update chart when theme or data changes
	$effect(() => {
		if (chart && browser && isDark !== undefined) {
			const color = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
			chart.updateOptions({
				colors: [color],
				plotOptions: {
					radar: {
						polygons: {
							strokeColors: isDark ? '#404040' : '#d1d5db',
							connectorColors: isDark ? '#404040' : '#d1d5db',
							fill: {
								colors: isDark ? ['#171717', '#262626'] : ['#f9fafb', '#f3f4f6']
							}
						}
					}
				},
				fill: {
					opacity: isDark ? 0.1 : 0.15
				},
				markers: {
					strokeColors: color
				}
			});
		}
	});

	$effect(() => {
		if (chart && browser && processedData.series.length > 0) {
			chart.updateSeries([
				{
					name: 'Completion',
					data: processedData.series
				}
			]);
		}
	});

	$effect(() => {
		if (!browser || !chartEl || processedData.labels.length === 0) return;

		import('apexcharts').then((mod) => {
			const ApexCharts = mod.default;

			const primaryColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';

			const options = {
				series: [
					{
						name: 'Completion',
						data: processedData.series
					}
				],
				chart: {
					height: 350,
					type: 'radar',
					toolbar: { show: false },
					background: 'transparent',
					dropShadow: {
						enabled: true,
						blur: 8,
						left: 1,
						top: 1,
						opacity: 0.2
					}
				},
				colors: [primaryColor],
				plotOptions: {
					radar: {
						size: 110,
						polygons: {
							strokeColors: isDark ? '#404040' : '#d1d5db',
							strokeWidth: '1px',
							connectorColors: isDark ? '#404040' : '#d1d5db',
							fill: {
								colors: isDark ? ['#171717', '#262626'] : ['#f9fafb', '#f3f4f6']
							}
						}
					}
				},
				stroke: {
					width: 2,
					curve: 'smooth'
				},
				fill: {
					type: 'solid',
					opacity: isDark ? 0.1 : 0.15
				},
				markers: {
					size: 4,
					colors: isDark ? ['#fff'] : [primaryColor],
					strokeColors: primaryColor,
					strokeWidth: 2
				},
				labels: processedData.labels,
				xaxis: {
					labels: {
						show: true,
						style: {
							colors: isDark ? '#94a3b8' : '#64748b',
							fontSize: '11px',
							fontWeight: 800,
							fontFamily: 'inherit'
						}
					}
				},
				yaxis: {
					show: false,
					min: 0,
					max: 100,
					tickAmount: 5
				},
				tooltip: {
					theme: isDark ? 'dark' : 'light',
					y: {
						formatter: (val: number) => val + '%'
					}
				}
			};

			if (chart) chart.destroy();
			chart = new ApexCharts(chartEl, options);
			chart.render();
		});

		return () => {
			if (chart) chart.destroy();
		};
	});
</script>

<div class="flex min-h-[350px] w-full items-center justify-center p-4">
	{#if processedData.labels.length > 0}
		<div bind:this={chartEl} class="w-full"></div>
	{:else}
		<div class="text-muted-foreground font-mono text-xs uppercase tracking-widest opacity-50">
			The competition hasn't started yet
		</div>
	{/if}
</div>
