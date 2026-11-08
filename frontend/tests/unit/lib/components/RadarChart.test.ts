import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';
import { describe, expect, it } from 'vitest';
import RadarChart from '$lib/components/RadarChart.svelte';

describe('RadarChart', () => {
	it('renders the placeholder message when no category data available', () => {
		renderWithProviders(RadarChart, {
			props: {
				solves: [],
				totalChallenges: []
			}
		});

		expect(screen.getByText('No category solve data available')).toBeInTheDocument();
	});

	it('prepares to render the chart when totalChallenges are provided', () => {
		const { container } = renderWithProviders(RadarChart, {
			props: {
				solves: [],
				totalChallenges: [
					{ category: 'Web', count: 5 },
					{ category: 'Pwn', count: 3 }
				]
			}
		});

		expect(screen.queryByText('No category solve data available')).not.toBeInTheDocument();
		const chartDiv = container.querySelector('div.w-full');
		expect(chartDiv).toBeDefined();
	});
});
