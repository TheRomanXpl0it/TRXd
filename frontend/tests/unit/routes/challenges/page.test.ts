import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from '../../../../src/routes/challenges/+page.svelte';
import { authState } from '$lib/stores/auth';
import { uiStore } from '$lib/stores/ui.svelte';
import { createQuery } from '@tanstack/svelte-query';
import { tick } from 'svelte';

// Mock dependencies
vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: null,
		ready: true,
		userMode: true,
		startTime: null
	}
}));

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		createQuery: vi.fn(),
		useQueryClient: vi.fn(() => ({
			setQueryData: vi.fn(),
			refetchQueries: vi.fn()
		}))
	};
});

vi.mock('$lib/challenges', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/challenges')>();
	return {
		...actual,
		getChallenges: vi.fn(),
		deleteChallenge: vi.fn()
	};
});

vi.mock('$lib/categories', () => ({
	getCategories: vi.fn()
}));

vi.mock('$lib/env', () => ({
	config: {
		startTime: null
	}
}));


describe('Challenges Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authState.user = null;
		authState.startTime = null;
		authState.endTime = null;

		// Default mock for queries
		(createQuery as any).mockReturnValue({
			data: [],
			isLoading: false,
			error: null
		});
	});

	it('shows the WaitingPage when competition is upcoming', async () => {
		// Set authState to upcoming (which makes upcoming true for non-admins)
		authState.ready = true;
		authState.startTime = new Date(Date.now() + 100000).toISOString();
		authState.user = { role: 'User' } as any;

		renderWithProviders(Page);

		// WaitingPage content should be visible (using actual subtitle)
		expect(await screen.findByText(/Prepare your horses/i)).toBeInTheDocument();
	});

	// Removed duplicate WaitingPage test

	it('shows challenges for Admins even if competition is upcoming', async () => {
		// Set authState to upcoming but user is Admin
		authState.ready = true;
		authState.startTime = new Date(Date.now() + 100000).toISOString();
		authState.user = { role: 'Admin' } as any;

		// Mock queries to return some data for admin
		(createQuery as any).mockReturnValue({
			data: [{ id: 1, name: 'Admin Chall', category: 'Web', points: 100 }],
			isLoading: false,
			error: null
		});

		renderWithProviders(Page);

		// Wait for dynamic imports of admin-only components
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Should show the admin challenge
		expect(await screen.findByText('Admin Chall')).toBeInTheDocument();
		// Should NOT show WaitingPage
		expect(screen.queryByText(/Prepare your horses/i)).not.toBeInTheDocument();
	});

	it('keeps challenges visible after the competition ends for players', async () => {
		authState.ready = true;
		authState.startTime = new Date(Date.now() - 200000).toISOString();
		authState.endTime = new Date(Date.now() - 100000).toISOString();
		authState.user = { role: 'Player' } as any;

		(createQuery as any)
			.mockReturnValueOnce({
				data: [{ id: 1, name: 'Post CTF Chall', category: 'Web', points: 100 }],
				isLoading: false,
				error: null
			})
			.mockReturnValueOnce({
				data: [],
				isLoading: false,
				error: null
			});

		renderWithProviders(Page);

		expect(await screen.findByText('Post CTF Chall')).toBeInTheDocument();
		expect(screen.getByText(/flag submissions are closed/i)).toBeInTheDocument();
		expect(screen.queryByText(/the final flag has been submitted/i)).not.toBeInTheDocument();
	});

	it('does not auto-open a challenge from the URL hash', async () => {
		window.location.hash = '#challenge-1';

		authState.ready = true;
		authState.startTime = new Date(Date.now() - 100000).toISOString();
		authState.user = { role: 'User' } as any;

		(createQuery as any).mockReturnValue({
			data: [{ id: 1, name: 'Hash Chall', category: 'Web', points: 100 }],
			isLoading: false,
			error: null
		});

		renderWithProviders(Page);
		expect(await screen.findByText('Hash Chall')).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(window.location.hash).toBe('#challenge-1');
	});

	it.each(['Author', 'Admin', 'Player'])(
		'searches author tags only for privileged roles: %s',
		async (role) => {
			const user = userEvent.setup();
			authState.user = { role } as any;
			vi.mocked(createQuery)
				.mockReturnValueOnce({
					data: [
						{
							id: 1,
							name: 'Web One',
							category: 'Web',
							tags: ['web'],
							author_tags: ['review'],
							points: 100
						},
						{ id: 2, name: 'Web Two', category: 'Web', tags: ['web'], points: 200 }
					],
					isLoading: false,
					error: null
				} as any)
				.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);
			renderWithProviders(Page);

			await user.type(screen.getByRole('textbox', { name: 'Search challenges' }), 'review');
			await waitFor(() => {
				expect(screen.queryByText('Web Two')).not.toBeInTheDocument();
				if (role === 'Player') {
					expect(screen.queryByText('Web One')).not.toBeInTheDocument();
				} else {
					expect(screen.getByText('Web One')).toBeInTheDocument();
				}
			});
		}
	);

	it.each(['Author', 'Player'])(
		'offers private tags in the tag filter only to authors: %s',
		async (role) => {
			const user = userEvent.setup();
			authState.user = { role } as any;
			vi.mocked(createQuery)
				.mockReturnValueOnce({
					data: [
						{
							id: 1,
							name: 'Web One',
							category: 'Web',
							tags: ['web'],
							author_tags: ['review'],
							points: 100
						},
						{ id: 2, name: 'Web Two', category: 'Web', tags: ['web'], points: 200 }
					],
					isLoading: false,
					error: null
				} as any)
				.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);
			renderWithProviders(Page);

			await user.click(screen.getByRole('button', { name: 'Filter by tags' }));
			expect(await screen.findByLabelText('Filter by web')).toBeInTheDocument();
			if (role === 'Author') {
				await user.click(screen.getByLabelText('Filter by review').parentElement!);
				await waitFor(() => expect(screen.queryByText('Web Two')).not.toBeInTheDocument());
				expect(screen.getByText('Web One')).toBeInTheDocument();
			} else {
				expect(screen.queryByLabelText('Filter by review')).not.toBeInTheDocument();
			}
		}
	);

	it('does not render toggle for hidden challenges for players', async () => {
		authState.user = { role: 'Player' } as any;
		vi.mocked(createQuery)
			.mockReturnValueOnce({
				data: [{ id: 1, name: 'Normal Chall', category: 'Web', points: 100, hidden: false }],
				isLoading: false,
				error: null
			} as any)
			.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);

		renderWithProviders(Page);

		expect(await screen.findByText('Normal Chall')).toBeInTheDocument();
		expect(screen.queryByTestId('toggle-hidden-challenges')).not.toBeInTheDocument();
	});

	it('renders toggle for hidden challenges for admins and filters hidden challenges on click', async () => {
		const user = userEvent.setup();
		authState.user = { role: 'Admin' } as any;
		vi.mocked(createQuery)
			.mockReturnValueOnce({
				data: [
					{ id: 1, name: 'Public Chall', category: 'Web', points: 100, hidden: false },
					{ id: 2, name: 'Secret Hidden Chall', category: 'Web', points: 200, hidden: true }
				],
				isLoading: false,
				error: null
			} as any)
			.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);

		renderWithProviders(Page);

		expect(await screen.findByText('Public Chall')).toBeInTheDocument();
		expect(screen.getByText('Secret Hidden Chall')).toBeInTheDocument();

		const toggleButton = screen.getByTestId('toggle-hidden-challenges');
		expect(toggleButton).toBeInTheDocument();
		expect(toggleButton).toHaveTextContent(/Hide hidden/i);

		// Click to hide hidden challenges
		await user.click(toggleButton);

		await waitFor(() => {
			expect(screen.queryByText('Secret Hidden Chall')).not.toBeInTheDocument();
			expect(screen.getByText('Public Chall')).toBeInTheDocument();
		});
		expect(toggleButton).toHaveTextContent(/Show hidden/i);

		// Click again to restore hidden challenges
		await user.click(toggleButton);

		await waitFor(() => {
			expect(screen.getByText('Secret Hidden Chall')).toBeInTheDocument();
			expect(screen.getByText('Public Chall')).toBeInTheDocument();
		});
		expect(toggleButton).toHaveTextContent(/Hide hidden/i);
	});

	it('collapses category challenges on click and persists to localStorage', async () => {
		const user = userEvent.setup();
		authState.user = { role: 'Player' } as any;
		uiStore.collapsedCategories = [];
		localStorage.clear();

		vi.mocked(createQuery)
			.mockReturnValueOnce({
				data: [
					{ id: 1, name: 'Web Chall 1', category: 'Web', points: 100 },
					{ id: 2, name: 'Crypto Chall 1', category: 'Crypto', points: 100 }
				],
				isLoading: false,
				error: null
			} as any)
			.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);

		renderWithProviders(Page);

		expect(await screen.findByText('Web Chall 1')).toBeInTheDocument();
		expect(screen.getByText('Crypto Chall 1')).toBeInTheDocument();

		const webToggle = screen.getByRole('button', { name: 'Toggle Web category' });
		expect(webToggle).toHaveAttribute('aria-expanded', 'true');

		await user.click(webToggle);

		await waitFor(() => {
			expect(screen.queryByText('Web Chall 1')).not.toBeInTheDocument();
			expect(screen.getByText('Crypto Chall 1')).toBeInTheDocument();
		});
		expect(webToggle).toHaveAttribute('aria-expanded', 'false');

		const stored = JSON.parse(localStorage.getItem('collapsed-categories') || '[]');
		expect(stored).toContain('Web');

		await user.click(webToggle);

		await waitFor(() => {
			expect(screen.getByText('Web Chall 1')).toBeInTheDocument();
		});
		expect(webToggle).toHaveAttribute('aria-expanded', 'true');

		const storedAfter = JSON.parse(localStorage.getItem('collapsed-categories') || '[]');
		expect(storedAfter).not.toContain('Web');
	});

	it('preserves the server order of challenges instead of re-sorting by points', async () => {
		authState.user = { role: 'Player' } as any;

		vi.mocked(createQuery)
			.mockReturnValueOnce({
				data: [
					{ id: 1, name: 'Hard Chall (Order 1)', category: 'Web', points: 500 },
					{ id: 2, name: 'Easy Chall (Order 2)', category: 'Web', points: 100 },
					{ id: 3, name: 'Medium Chall (Order 3)', category: 'Web', points: 250 }
				],
				isLoading: false,
				error: null
			} as any)
			.mockReturnValueOnce({ data: [], isLoading: false, error: null } as any);

		renderWithProviders(Page);

		const cards = await screen.findAllByRole('heading', { level: 3 });
		const titles = cards.map((c) => c.textContent?.trim());
		expect(titles).toEqual([
			'Hard Chall (Order 1)',
			'Easy Chall (Order 2)',
			'Medium Chall (Order 3)'
		]);
	});
});
