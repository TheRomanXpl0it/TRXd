import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';
import Page from '../../../../src/routes/challenges/+page.svelte';

const challengeData = [
	{
		id: 1,
		name: 'Sidebar Chall',
		category: 'Web',
		description: 'hash sync regression test',
		points: 100,
		tags: [],
		attachments: [],
		authors: [],
		solves: 0
	}
];

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	pushState: vi.fn()
}));

vi.mock('$lib/stores/ui.svelte', () => ({
	uiStore: {
		challengeView: 'sidebar',
		setChallengeView: vi.fn()
	}
}));

vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: { role: 'User', team_id: 1 },
		ready: true,
		userMode: false,
		startTime: new Date(Date.now() - 60_000).toISOString(),
		endTime: new Date(Date.now() + 60_000).toISOString()
	}
}));

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		createQuery: vi.fn((factory: () => { queryKey: string[] }) => {
			const options = factory();

			if (options.queryKey[0] === 'challenges') {
				return {
					data: challengeData,
					isLoading: false,
					error: null,
					refetch: vi.fn()
				};
			}

			if (options.queryKey[0] === 'categories') {
				return {
					data: ['Web'],
					isLoading: false,
					error: null
				};
			}

			return {
				data: [],
				isLoading: false,
				error: null
			};
		}),
		useQueryClient: vi.fn(() => ({
			setQueryData: vi.fn()
		}))
	};
});

vi.mock('$lib/challenges', () => ({
	getChallenges: vi.fn(() => Promise.resolve(challengeData)),
	deleteChallenge: vi.fn(),
	getSolves: vi.fn(() => Promise.resolve([])),
	submitFlag: vi.fn()
}));

vi.mock('$lib/categories', () => ({
	getCategories: vi.fn(() => Promise.resolve(['Web']))
}));

vi.mock('$lib/env', () => ({
	config: {}
}));

describe('Challenges Page sidebar mode', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/challenges#challenge-1');
	});

	it('renders the first challenge without using the URL hash', async () => {
		renderWithProviders(Page);

		expect(await screen.findByRole('heading', { level: 1, name: 'Sidebar Chall' })).toBeInTheDocument();
		expect(window.location.hash).toBe('#challenge-1');
	});
});
