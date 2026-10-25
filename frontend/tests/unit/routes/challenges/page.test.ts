import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from '../../../../src/routes/challenges/+page.svelte';
import { authState } from '$lib/stores/auth';
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

vi.mock('$lib/challenges', () => ({
	getChallenges: vi.fn(),
	deleteChallenge: vi.fn()
}));

vi.mock('$lib/categories', () => ({
	getCategories: vi.fn()
}));

vi.mock('$lib/env', () => ({
	config: {
		startTime: null
	}
}));

// Mock the admin-only modal and controls to prevent errors from dynamic imports or missing aliases
vi.mock('$lib/components/challenges/CreateChallengeModal.svelte', () => ({
	default: () => null
}));
vi.mock('$lib/components/challenges/AdminControls.svelte', () => ({
	default: () => null
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
});
