import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../../../../../src/routes/admin/users/+page.svelte';

const getUsersMock = vi.hoisted(() => vi.fn());
const getUserByNameMock = vi.hoisted(() => vi.fn());
const updateUserRoleMock = vi.hoisted(() => vi.fn());
const showSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/user', () => ({
	getUsers: getUsersMock,
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
		getUsersMock.mockReset();
		getUserByNameMock.mockReset();
		updateUserRoleMock.mockReset();
		showSuccessMock.mockReset();
		getUsersMock.mockResolvedValue({
			success: true,
			data: [],
			pagination: { total: 0, page: 1, per_page: 20, pages: 0 }
		});
		getUserByNameMock.mockResolvedValue([
			{ id: 7, name: 'Alice Example', email: 'alice@ctf.io', role: 'Player' },
			{ id: 8, name: 'Alicia Example', email: 'alicia@ctf.io', role: 'Author' }
		]);
		updateUserRoleMock.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		authState.ready = false;
		authState.user = null;
	});

	it('renders an initial paginated users table before searching and places Profile on the right', async () => {
		getUsersMock.mockResolvedValue({
			success: true,
			data: [{ id: 3, name: 'Bob Builder', role: 'Player' }],
			pagination: { total: 1, page: 1, per_page: 20, pages: 1 }
		});

		render(Page);

		expect(await screen.findByText('Bob Builder')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();

		const resetBtn = screen.getByRole('button', { name: 'Reset' });
		const profileLink = screen.getByRole('link', { name: 'Profile' });
		expect(resetBtn.compareDocumentPosition(profileLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('uses Name copy even in userMode and keeps initial Role disabled without user_id', async () => {
		authState.userMode = true;
		getUsersMock.mockResolvedValue({
			success: true,
			data: [{ id: 5, name: 'Solo Player', role: 'Player' }],
			pagination: { total: 1, page: 1, per_page: 20, pages: 1 }
		});

		render(Page);

		expect(await screen.findByText('Solo Player')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Team' })).not.toBeInTheDocument();
		expect(screen.getByLabelText('Role for Solo Player')).toBeDisabled();
		expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/account/5');
	});

	it('shows API search results with their ID and email, then lets an admin change a role', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Name'), {
			target: { value: 'alice' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

		expect(await screen.findByText('7')).toBeInTheDocument();
		expect(screen.getByText('Alice Example')).toBeInTheDocument();
		expect(screen.getByText('alice@ctf.io')).toBeInTheDocument();
		expect(screen.getByText('8')).toBeInTheDocument();
		expect(screen.getByText('alicia@ctf.io')).toBeInTheDocument();

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

		await fireEvent.input(screen.getByPlaceholderText('Name'), {
			target: { value: 'missing-user' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

		expect(await screen.findByText(/No user found with name/i)).toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});
});
