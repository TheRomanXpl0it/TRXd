import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Scoreboard from '../../../../src/routes/scoreboard/+page.svelte';
import { authState } from '$lib/stores/auth';
import { createQuery } from '@tanstack/svelte-query';

// Mock the scoreboard API functions
vi.mock('@/scoreboard', () => ({
	getScoreboard: vi.fn(() => Promise.resolve({ data: [], pagination: { total: 0 } })),
	getGraphData: vi.fn(() => Promise.resolve([]))
}));

// Mock svelte-query
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		createQuery: vi.fn(() => ({
			data: { data: [], pagination: { total: 0 } },
			isLoading: false,
			error: null
		}))
	};
});

describe('Scoreboard Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset authState defaults
		authState.ready = true;
		authState.startTime = null;
		authState.user = { id: 1, name: 'Test User', role: 'Player' } as any;
	});

	it('shows Scoreboard even if competition is upcoming', async () => {
		authState.startTime = new Date(Date.now() + 1000000).toISOString();

		renderWithProviders(Scoreboard);

		// Should NOT show WaitingPage, but the Scoreboard header
		expect(screen.getByText('Scoreboard')).toBeInTheDocument();
		expect(screen.queryByText('Starting soon')).not.toBeInTheDocument();
	});

	it('renders scoreboard rows with correct country mapping', async () => {
		const mockTeams = [
			{ id: 1, name: 'Team One', score: 1000, country: 'USA' },
			{ id: 2, name: 'Team Two', score: 800, country: 'ITA' }
		];

		// Mock the query data
		vi.mocked(createQuery).mockReturnValue({
			data: { data: mockTeams, pagination: { total: 2 } },
			isLoading: false,
			error: null
		} as any);

		renderWithProviders(Scoreboard);

		expect(screen.getByText('Team One')).toBeInTheDocument();
		expect(screen.getByText('1,000 pts')).toBeInTheDocument();
		expect(screen.getByText('Team Two')).toBeInTheDocument();
		expect(screen.getByText('800 pts')).toBeInTheDocument();
        
        // Check if USA and ITA are mapped correctly via their ISO3 codes
        // The component uses getCountryIso2 which I optimized
        expect(screen.getByText('USA')).toBeInTheDocument();
        expect(screen.getByText('ITA')).toBeInTheDocument();
	});
});
