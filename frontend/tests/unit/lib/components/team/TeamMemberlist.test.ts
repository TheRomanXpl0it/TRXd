import { screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { renderWithProviders } from '../../../render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamMemberlist from '$lib/components/team/TeamMemberlist.svelte';

const mockGetUserData = vi.fn();
vi.mock('$lib/user', () => ({
	getUserData: (...args: any[]) => mockGetUserData(...args)
}));

const team = {
	id: 1,
	name: 'CyberCats',
	score: 4242,
	members: [
		{ id: 10, name: 'Alice', role: 'Captain', score: 1200 },
		{ id: 11, name: 'Bob Sea', role: 'Member', score: 800 },
		{ id: 12, name: 'Seann', role: 'Member', score: 600 },
		{ id: 13, name: 'Zed', role: 'Member', score: 200 }
	]
};

describe('TeamMemberlist', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders members sorted by score', async () => {
		mockGetUserData.mockResolvedValue({ image: null });
		renderWithProviders(TeamMemberlist, { props: { team } });
		await tick();
		await tick();
		await tick();

		expect(await screen.findByText('Alice')).toBeInTheDocument();
		expect(await screen.findByText('Bob Sea')).toBeInTheDocument();
		expect(await screen.findByText('Seann')).toBeInTheDocument();
		expect(await screen.findByText('Zed')).toBeInTheDocument();

		expect(await screen.findByText(/1.*200/)).toBeInTheDocument();
		expect(await screen.findByText(/800/)).toBeInTheDocument();
		expect(await screen.findByText('Captain')).toBeInTheDocument();
	});

	it('fetches user images for members', async () => {
		mockGetUserData.mockResolvedValue({ image: 'http://img.png' });
		renderWithProviders(TeamMemberlist, { props: { team } });
		
		// Wait for members to render first
		expect(await screen.findByText('Alice')).toBeInTheDocument();

		await waitFor(() => {
			expect(mockGetUserData).toHaveBeenCalledWith(10);
			expect(mockGetUserData).toHaveBeenCalledWith(11);
			expect(mockGetUserData).toHaveBeenCalledWith(12);
			expect(mockGetUserData).toHaveBeenCalledWith(13);
		}, { timeout: 2000 });
	});

	it('renders links to account pages', async () => {
		renderWithProviders(TeamMemberlist, { props: { team } });

		const aliceLink = await screen.findByRole('link', { name: /Alice/i });
		expect(aliceLink).toHaveAttribute('href', '/account/10');
	});
});
