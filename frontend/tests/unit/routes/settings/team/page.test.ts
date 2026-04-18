import { screen, cleanup } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import TeamSettings from '../../../../../src/routes/settings/team/+page.svelte';
import { authState } from '$lib/stores/auth';

import { createQuery } from '@tanstack/svelte-query';

// Mock team API
vi.mock('$lib/team', () => ({
	getTeam: vi.fn((id) => Promise.resolve({ id, name: 'Mock Team', country: 'USA' })),
	updateTeam: vi.fn(() => Promise.resolve()),
	resetTeamPassword: vi.fn(() => Promise.resolve()),
	getTeamInviteToken: vi.fn(() => Promise.resolve({ token: 'mock-token' }))
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

// Mock GeneratedAvatar to avoid canvas issues in tests
vi.mock('$lib/components/ui/avatar/generated-avatar.svelte', () => ({
	default: vi.fn()
}));

// Mock toast
vi.mock('$lib/utils/toast', () => ({
	showSuccess: vi.fn(),
	showError: vi.fn()
}));

describe('Team Settings Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset authState
        authState.ready = true;
        authState.userMode = false;
        authState.user = { id: 1, name: 'Test User', team_id: 123 } as any;
        
        // Default createQuery mock
        (createQuery as any).mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders team information when user belongs to a team', async () => {
        const mockTeam = { id: 123, name: 'Alpha Team', country: 'USA' };
        (createQuery as any).mockReturnValue({ data: mockTeam });
        
        renderWithProviders(TeamSettings);
        await new Promise(r => setTimeout(r, 0));

        expect(screen.getByText(/Alpha Team/i)).toBeInTheDocument();
        expect(screen.getAllByText(/USA/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Active Team/i)).toBeInTheDocument();
    });

    it('shows recruitment section with invite button', async () => {
        const mockTeam = { id: 123, name: 'Alpha Team', country: 'USA' };
        (createQuery as any).mockReturnValue({ data: mockTeam });
        
        renderWithProviders(TeamSettings);

        expect(screen.getByText('Recruitment')).toBeInTheDocument();
        expect(screen.getByText('Copy Invite Link')).toBeInTheDocument();
    });

    it('shows restricted access message when user has no team', async () => {
        authState.user = { id: 1, name: 'Test User', team_id: null } as any;
        (createQuery as any).mockReturnValue({ data: null });
        
        renderWithProviders(TeamSettings);

        expect(screen.getByText('Team Access Restricted')).toBeInTheDocument();
        expect(screen.getByText('Go to Team Dashboard')).toBeInTheDocument();
    });

    it('initializes name from user name in userMode (Individual Mode)', async () => {
        authState.userMode = true;
        authState.user = { id: 1, name: 'Individual Player', team_id: 456 } as any;
        (createQuery as any).mockReturnValue({ data: { id: 456, name: 'Individual Player', country: 'GBR' } });
        
        renderWithProviders(TeamSettings);

        expect(screen.getByText('Individual Player')).toBeInTheDocument();
    });
});
