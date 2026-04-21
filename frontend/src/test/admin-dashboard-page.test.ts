import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../routes/admin/+page.svelte';

const getAdminStatsMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/challenges', () => ({
	getAdminStats: getAdminStatsMock
}));

describe('Admin dashboard page', () => {
	beforeEach(() => {
		authState.ready = false;
		authState.user = null;
		getAdminStatsMock.mockReset();
		getAdminStatsMock.mockResolvedValue({
			total_users: 12,
			total_players: 10,
			total_teams: 4,
			total_challenges: 8,
			total_released_challenges: 6,
			total_submissions: 20,
			total_correct_submissions: 7
		});
	});

	afterEach(() => {
		authState.ready = false;
		authState.user = null;
	});

	it('fetches stats when auth becomes ready for an author user', async () => {
		render(Page);

		authState.user = {
			name: 'Author User',
			role: 'Author'
		} as any;
		authState.ready = true;

		await waitFor(() => expect(getAdminStatsMock).toHaveBeenCalledTimes(1));
		await screen.findByText('6/8');
		expect(screen.getByText('10')).toBeInTheDocument();
		expect(screen.getByText('7')).toBeInTheDocument();
	});
});
