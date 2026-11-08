import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from '../../../../../src/routes/account/[[id]]/+page.svelte';
import { authState } from '$lib/stores/auth';
import { createQuery } from '@tanstack/svelte-query';
import { page } from '$app/stores';

// Mock auth store
vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: { id: 1, role: 'User' },
		ready: true,
		userMode: true,
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
				params: { id: '1' },
				url: new URL('http://localhost/account/1')
			});
			return () => {};
		}
	}
}));

vi.mock('$lib/user', () => ({
	getUserData: vi.fn(),
	updateUser: vi.fn()
}));

vi.mock('$lib/team', () => ({
	getTeam: vi.fn()
}));

vi.mock('$lib/components/RadarChart.svelte', () => ({
	default: vi.fn(() => ({ render: () => '' }))
}));

describe('Account Profile Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock for user query
		(createQuery as any).mockReturnValue({
			data: { id: 1, name: 'Test User', solves: [], badges: [] },
			isLoading: false,
			error: null
		});
	});

	it('hides statistics cards when competition is upcoming', () => {
		// Set authState to upcoming
		authState.ready = true;
		authState.startTime = new Date(Date.now() + 100000).toISOString();

		renderWithProviders(Page);

		// Cards that should be HIDDEN
		expect(screen.queryByText('Category Breakdown')).not.toBeInTheDocument();

		// Player name should still be there
		expect(screen.getByText('Test User')).toBeInTheDocument();
	});

	it('shows statistics cards when competition has started', () => {
		// Set authState to NOT upcoming
		authState.ready = true;
		authState.startTime = new Date(Date.now() - 100000).toISOString();

		renderWithProviders(Page);

		// Cards that should be VISIBLE
		expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
	});

	it('renders pencil button and opens edit profile dialog for own profile', async () => {
		const user = userEvent.setup();
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, name: 'Alice', role: 'Player' } as any;

		(createQuery as any).mockImplementation((options: any) => {
			const config = typeof options === 'function' ? options() : options;
			if (config.queryKey[0] === 'user') {
				return {
					data: {
						id: 1,
						name: 'Alice',
						role: 'Player',
						email: 'alice@example.com',
						joined_at: '2026-01-15T00:00:00Z',
						country: 'ITA',
						solves: [],
						badges: []
					},
					isLoading: false,
					error: null
				};
			}
			return { data: null, isLoading: false, error: null };
		});

		renderWithProviders(Page);

		const editBtn = screen.getByRole('button', { name: /edit profile/i });
		expect(editBtn).toBeInTheDocument();

		await user.click(editBtn);

		expect(await screen.findByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/display name/i)).toHaveValue('Alice');
	});

	it('renders team above player name in team mode', async () => {
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, role: 'Player' } as any;

		(createQuery as any).mockImplementation((options: any) => {
			const config = typeof options === 'function' ? options() : options;
			if (config.queryKey[0] === 'user') {
				return {
					data: {
						id: 1,
						name: 'Bob',
						role: 'Player',
						team_id: 42,
						solves: [],
						badges: []
					},
					isLoading: false,
					error: null
				};
			}
			if (config.queryKey[0] === 'team') {
				return {
					data: { id: 42, name: 'Team Secret', solves: [], badges: [] },
					isLoading: false,
					error: null
				};
			}
			return { data: null, isLoading: false, error: null };
		});

		renderWithProviders(Page);

		expect(await screen.findByText('Bob')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /team secret/i })).toBeInTheDocument();
	});

	it('renders role tag above name, country row below name, email, joined date, and change password link', async () => {
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, role: 'Player' } as any;

		(createQuery as any).mockImplementation((options: any) => {
			const config = typeof options === 'function' ? options() : options;
			if (config.queryKey[0] === 'user') {
				return {
					data: {
						id: 1,
						name: 'Charlie',
						role: 'Author',
						email: 'charlie@example.com',
						joined_at: '2026-03-20T00:00:00Z',
						country: 'FRA',
						solves: [],
						badges: []
					},
					isLoading: false,
					error: null
				};
			}
			return { data: null, isLoading: false, error: null };
		});

		renderWithProviders(Page);

		expect(await screen.findByText('Charlie')).toBeInTheDocument();
		expect(screen.getByText('Author')).toBeInTheDocument();
		expect(screen.getByText('France')).toBeInTheDocument();
		expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
		const expectedDate = new Date('2026-03-20T00:00:00Z');
		const pad = (n: number) => String(n).padStart(2, '0');
		const expectedDateStr = `${pad(expectedDate.getDate())}/${pad(expectedDate.getMonth() + 1)}/${expectedDate.getFullYear()}`;
		expect(screen.getByText(new RegExp(expectedDateStr))).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /change password/i })).toHaveAttribute(
			'href',
			'/settings/profile'
		);
	});
});
