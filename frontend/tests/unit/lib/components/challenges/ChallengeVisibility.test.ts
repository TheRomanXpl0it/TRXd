import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChallengeCard from '$lib/components/challenges/ChallengeCard.svelte';
import { authState } from '$lib/stores/auth';

// Mock authState
vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: {
			role: 'User'
		}
	}
}));

function makeChallenge(overrides = {}) {
	return {
		id: 1,
		name: 'Test Challenge',
		points: 100,
		tags: ['web'],
		solved: false,
		hidden: false,
		...overrides
	};
}

describe('Challenge Visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset role to regular User by default
		authState.user = { role: 'User' } as any;
	});

	it('does not show "Hidden" badge to regular users', () => {
		const challenge = makeChallenge({ hidden: true });
		
		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.queryByText(/Hidden/i)).not.toBeInTheDocument();
	});

	it('shows "Hidden" badge to Admins', async () => {
		// Elevate privileges
		authState.user = { role: 'Admin' } as any;
		
		const challenge = makeChallenge({ hidden: true });
		
		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText(/Hidden/i)).toBeInTheDocument();
	});

	it('shows "Hidden" badge to Authors', async () => {
		// Elevate privileges
		authState.user = { role: 'Author' } as any;
		
		const challenge = makeChallenge({ hidden: true });
		
		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText(/Hidden/i)).toBeInTheDocument();
	});

	it('does not show "Hidden" badge for visible challenges even for Admins', () => {
		authState.user = { role: 'Admin' } as any;
		
		const challenge = makeChallenge({ hidden: false });
		
		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.queryByText(/Hidden/i)).not.toBeInTheDocument();
	});
});
