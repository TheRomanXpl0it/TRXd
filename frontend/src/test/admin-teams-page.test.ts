import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../routes/admin/teams/+page.svelte';

const getTeamByNameMock = vi.hoisted(() => vi.fn());
const resetTeamPasswordMock = vi.hoisted(() => vi.fn());
const showSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/team', () => ({
	getTeamByName: getTeamByNameMock,
	getTeamByEmail: vi.fn(),
	resetTeamPassword: resetTeamPasswordMock
}));

vi.mock('$lib/utils/toast', () => ({
	showSuccess: showSuccessMock,
	showError: vi.fn()
}));

describe('Admin teams page', () => {
	beforeEach(() => {
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, role: 'Admin' } as any;
		getTeamByNameMock.mockReset();
		resetTeamPasswordMock.mockReset();
		showSuccessMock.mockReset();
		getTeamByNameMock.mockResolvedValue([
			{ id: 42, name: 'Team Alpha', email: 'alpha@example.com', country: 'ITA' }
		]);
		resetTeamPasswordMock.mockResolvedValue({ new_password: 'new-secret-pass' });
	});

	afterEach(() => {
		authState.ready = false;
		authState.user = null;
	});

	it('shows search results with team fields and lets admin reset password', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText(/Exact team name/i), {
			target: { value: 'Team Alpha' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

		expect(await screen.findByText('42')).toBeInTheDocument();
		expect(screen.getByText('Team Alpha')).toBeInTheDocument();
		expect(screen.getByText('alpha@example.com')).toBeInTheDocument();
		expect(screen.getByText('ITA')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
		await fireEvent.click(screen.getByRole('button', { name: 'Generate Password' }));

		expect(resetTeamPasswordMock).toHaveBeenCalledWith(42);
		expect(await screen.findByText('new-secret-pass')).toBeInTheDocument();
	});
});
