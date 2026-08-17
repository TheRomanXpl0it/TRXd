import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../routes/admin/users/+page.svelte';

const getUserByNameMock = vi.hoisted(() => vi.fn());
const updateUserRoleMock = vi.hoisted(() => vi.fn());
const showSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/user', () => ({
	getUserByName: getUserByNameMock,
	getUserByEmail: vi.fn(),
	resetUserPassword: vi.fn(),
	updateUserRole: updateUserRoleMock
}));

vi.mock('$lib/utils/toast', () => ({
	showSuccess: showSuccessMock,
	showError: vi.fn()
}));

describe('Admin users page', () => {
	beforeEach(() => {
		authState.ready = true;
		authState.userMode = false;
		authState.user = { id: 1, role: 'Admin' } as any;
		getUserByNameMock.mockReset();
		updateUserRoleMock.mockReset();
		showSuccessMock.mockReset();
		getUserByNameMock.mockResolvedValue([
			{ id: 7, name: 'Alice Example', username: 'alice', role: 'Player' },
			{ id: 8, name: 'Alicia Example', username: 'alicia', role: 'Author' }
		]);
		updateUserRoleMock.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		authState.ready = false;
		authState.user = null;
	});

	it('shows API search results with their ID and username, then lets an admin change a role', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText(/Exact username/i), {
			target: { value: 'alice' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

		expect(await screen.findByText('7')).toBeInTheDocument();
		expect(screen.getByText('Alice Example')).toBeInTheDocument();
		expect(screen.getByText('@alice')).toBeInTheDocument();
		expect(screen.getByText('8')).toBeInTheDocument();
		expect(screen.getByText('@alicia')).toBeInTheDocument();

		const roleSelect = await screen.findByLabelText('Role for Alice Example');
		expect(roleSelect).toBeEnabled();
		await fireEvent.keyDown(roleSelect, { key: 'ArrowDown' });
		await fireEvent.pointerUp(await screen.findByRole('option', { name: 'Author' }));

		await waitFor(() => expect(updateUserRoleMock).toHaveBeenCalledWith(7, 'Author'));
		expect(roleSelect).toHaveTextContent('Author');
		expect(showSuccessMock).toHaveBeenCalledWith('Role for Alice Example updated to Author.');
	});

	it('shows an empty state instead of an invalid user row when the search has no results', async () => {
		getUserByNameMock.mockResolvedValue([]);
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText(/Exact username/i), {
			target: { value: 'missing-user' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

		expect(await screen.findByText(/No user found with name/i)).toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});
});
