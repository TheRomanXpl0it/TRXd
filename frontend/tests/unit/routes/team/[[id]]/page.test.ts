import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from '../../../../../src/routes/team/[[id]]/+page.svelte';
import { authState } from '$lib/stores/auth';
import { createQuery } from '@tanstack/svelte-query';
import { page } from '$app/stores';

// Mock auth store
vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: { id: 1, team_id: 10 },
		ready: true,
		userMode: false,
		startTime: null
	},
	loadUser: vi.fn()
}));

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		createQuery: vi.fn(),
		useQueryClient: vi.fn(() => ({
			setQueryData: vi.fn(),
			refetchQueries: vi.fn(),
			invalidateQueries: vi.fn()
		}))
	};
});

vi.mock('$app/stores', () => ({
	page: {
		subscribe: (fn: (v: any) => void) => {
			fn({
				params: { id: '10' },
				url: new URL('http://localhost/team/10')
			});
			return () => {};
		}
	}
}));

vi.mock('$lib/team', () => ({
	getTeam: vi.fn(),
	updateTeam: vi.fn()
}));

vi.mock('$lib/components/RadarChart.svelte', () => ({
	default: vi.fn(() => ({ render: () => '' }))
}));

describe('Team Profile Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock for team query
		(createQuery as any).mockReturnValue({
			data: { id: 10, name: 'Test Team', solves: [], totalChallenges: [] },
			isLoading: false,
			error: null
		});
	});

	it('hides statistics cards when competition is upcoming', () => {
		authState.ready = true;
		authState.startTime = new Date(Date.now() + 100000).toISOString();

		renderWithProviders(Page);

		expect(screen.queryByText('Category Breakdown')).not.toBeInTheDocument();
		expect(screen.getByText('Test Team')).toBeInTheDocument();
	});

	it('shows statistics cards when competition has started', () => {
		authState.ready = true;
		authState.startTime = new Date(Date.now() - 100000).toISOString();

		renderWithProviders(Page);

		expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
	});

	it('renders pencil button and opens edit team dialog for own team', async () => {
		const user = userEvent.setup();
		authState.ready = true;
		authState.user = { id: 1, team_id: 10 } as any;

		(createQuery as any).mockReturnValue({
			data: {
				id: 10,
				name: 'CyberDefenders',
				country: 'ITA',
				members: [{ id: 1, name: 'Alice' }],
				solves: [],
				badges: []
			},
			isLoading: false,
			error: null
		});

		renderWithProviders(Page);

		const editBtn = screen.getByRole('button', { name: /edit team profile/i });
		expect(editBtn).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute(
			'href',
			'/settings/team'
		);

		await user.click(editBtn);

		expect(await screen.findByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /edit team/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/team name/i)).toHaveValue('CyberDefenders');
	});

	it('renders country row below team name, members count, and joined date with day', async () => {
		authState.ready = true;
		authState.user = { id: 2, team_id: 99 } as any;

		(createQuery as any).mockReturnValue({
			data: {
				id: 10,
				name: 'AlphaSquad',
				role: 'Admin',
				country: 'DEU',
				email: 'alpha@example.com',
				members: [{ id: 1 }, { id: 2 }],
				joined_at: '2026-02-14T00:00:00Z',
				solves: [],
				badges: []
			},
			isLoading: false,
			error: null
		});

		renderWithProviders(Page);

		expect(await screen.findByText('AlphaSquad')).toBeInTheDocument();
		expect(screen.getByText('Admin')).toBeInTheDocument();
		expect(screen.getByText('Germany')).toBeInTheDocument();
		expect(screen.getByText('alpha@example.com')).toBeInTheDocument();
		expect(screen.getByText('2 members')).toBeInTheDocument();
		const expectedDate = new Date('2026-02-14T00:00:00Z');
		const pad = (n: number) => String(n).padStart(2, '0');
		const expectedDateStr = `${pad(expectedDate.getDate())}/${pad(expectedDate.getMonth() + 1)}/${expectedDate.getFullYear()}`;
		expect(screen.getByText(new RegExp(expectedDateStr))).toBeInTheDocument();
	});
});
