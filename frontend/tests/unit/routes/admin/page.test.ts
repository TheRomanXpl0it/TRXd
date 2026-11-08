import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../../../../src/routes/admin/+page.svelte';

const getAdminStatsMock = vi.hoisted(() => vi.fn());
const getInstancesMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/challenges', () => ({
	getAdminStats: getAdminStatsMock
}));

vi.mock('$lib/instances', () => ({
	getInstances: getInstancesMock
}));

describe('Admin dashboard page', () => {
	beforeEach(() => {
		authState.ready = false;
		authState.user = null;
		getAdminStatsMock.mockReset();
		getInstancesMock.mockReset();
		getInstancesMock.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
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
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('7')).toBeInTheDocument();
	});

	it('renders Submissions card before Instances card', async () => {
		authState.user = { name: 'Admin User', role: 'Admin' } as any;
		authState.ready = true;
		render(Page);

		await waitFor(() => expect(getAdminStatsMock).toHaveBeenCalledTimes(1));
		const submissionsTitle = screen.getByText('Submissions');
		const instancesTitle = screen.getByText('Instances');
		expect(submissionsTitle.compareDocumentPosition(instancesTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
