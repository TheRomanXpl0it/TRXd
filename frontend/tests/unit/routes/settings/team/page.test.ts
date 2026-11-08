import { screen, cleanup } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import TeamSettings from '../../../../../src/routes/settings/team/+page.svelte';
import { authState } from '$lib/stores/auth';

// Mock team API
vi.mock('$lib/team', () => ({
	resetTeamPassword: vi.fn(() => Promise.resolve()),
	getTeamInviteToken: vi.fn(() => Promise.resolve({ token: 'mock-token' }))
}));

// Mock toast
vi.mock('$lib/utils/toast', () => ({
	showSuccess: vi.fn(),
	showError: vi.fn()
}));

describe('Team Settings Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, name: 'Test User', team_id: 123 } as any;
	});

	afterEach(() => {
		cleanup();
	});

	it('shows recruitment section with invite button when user has a team', async () => {
		renderWithProviders(TeamSettings);

		expect(screen.getByText('Recruitment')).toBeInTheDocument();
		expect(screen.getByText(/copy invite link/i)).toBeInTheDocument();
	});

	it('shows security section to change team password', async () => {
		renderWithProviders(TeamSettings);

		expect(screen.getByText('Security')).toBeInTheDocument();
		expect(screen.getByLabelText(/new team password/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /update team password/i })).toBeInTheDocument();
	});

	it('shows restricted access message when user has no team', async () => {
		authState.user = { id: 1, name: 'Test User', team_id: null } as any;

		renderWithProviders(TeamSettings);

		expect(screen.getByText(/team access restricted/i)).toBeInTheDocument();
		expect(screen.getByText(/go to team dashboard/i)).toBeInTheDocument();
	});
});
