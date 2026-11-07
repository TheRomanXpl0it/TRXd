import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../../render';
import Page from '../../../../../src/routes/admin/challenges/+page.svelte';
import { getChallenges, deleteChallenge, toggleChallengesHidden } from '$lib/challenges';
import { authState } from '$lib/stores/auth';
import { uiStore } from '$lib/stores/ui.svelte';

vi.mock('$lib/challenges', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/challenges')>();
	return {
		...actual,
		getChallenges: vi.fn(),
		deleteChallenge: vi.fn(),
		toggleChallengesHidden: vi.fn()
	};
});

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('Admin Challenges Page', () => {
	const mockChallenges = [
		{ id: 1, name: 'Web Chall 1', category: 'Web', points: 100, solves: 5, hidden: false },
		{ id: 2, name: 'Crypto Chall 1', category: 'Crypto', points: 200, solves: 2, hidden: true }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		uiStore.collapsedAdminCategories = [];
		authState.user = { role: 'Admin' } as any;
		vi.mocked(getChallenges).mockResolvedValue(mockChallenges as any);
	});

	it('groups challenges by category and renders headers with counts', async () => {
		renderWithProviders(Page);

		expect(await screen.findByText('Web Chall 1')).toBeInTheDocument();
		expect(screen.getByText('Crypto Chall 1')).toBeInTheDocument();

		expect(screen.getByRole('button', { name: 'Toggle Web category' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Toggle Crypto category' })).toBeInTheDocument();
	});

	it('collapses category challenges on click and persists to localStorage', async () => {
		const user = userEvent.setup();
		renderWithProviders(Page);

		expect(await screen.findByText('Web Chall 1')).toBeInTheDocument();

		const webToggle = screen.getByRole('button', { name: 'Toggle Web category' });
		expect(webToggle).toHaveAttribute('aria-expanded', 'true');

		await user.click(webToggle);

		await waitFor(() => {
			expect(screen.queryByText('Web Chall 1')).not.toBeInTheDocument();
			expect(screen.getByText('Crypto Chall 1')).toBeInTheDocument();
		});
		expect(webToggle).toHaveAttribute('aria-expanded', 'false');

		const stored = JSON.parse(localStorage.getItem('collapsed-admin-categories') || '[]');
		expect(stored).toContain('Web');

		// Click again to re-expand
		await user.click(webToggle);

		await waitFor(() => {
			expect(screen.getByText('Web Chall 1')).toBeInTheDocument();
		});
		expect(webToggle).toHaveAttribute('aria-expanded', 'true');

		const storedAfter = JSON.parse(localStorage.getItem('collapsed-admin-categories') || '[]');
		expect(storedAfter).not.toContain('Web');
	});

	it('renders author tags in their own dedicated column', async () => {
		vi.mocked(getChallenges).mockResolvedValue([
			{
				id: 1,
				name: 'Web Chall 1',
				category: 'Web',
				author_tags: ['private-hint', 'sec-note'],
				points: 100,
				solves: 0,
				hidden: false
			}
		] as any);

		renderWithProviders(Page);

		expect(await screen.findByText('Author Tags')).toBeInTheDocument();
		expect(screen.getByText('private-hint')).toBeInTheDocument();
		expect(screen.getByText('sec-note')).toBeInTheDocument();
	});
});
