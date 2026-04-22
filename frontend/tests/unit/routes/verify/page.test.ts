import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { completeVerifiedRegistration, loadUser, goto, toast, authState } = vi.hoisted(() => ({
	completeVerifiedRegistration: vi.fn(),
	loadUser: vi.fn(),
	goto: vi.fn(),
	toast: {
		success: vi.fn(),
		error: vi.fn()
	},
	authState: {
		user: { team_id: null as number | null },
		ready: true,
		userMode: false,
		emailVerification: true,
		startTime: null,
		endTime: null
	}
}));

vi.mock('$lib/auth', () => ({
	completeVerifiedRegistration
}));

vi.mock('@/stores/auth', () => ({
	authState,
	loadUser
}));

vi.mock('$app/navigation', () => ({
	goto,
	replaceState: vi.fn()
}));

vi.mock('svelte-sonner', () => ({
	toast
}));

import { renderWithProviders } from '../../render';
import Page from '../../../../src/routes/verify/+page.svelte';

describe('Verify Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		window.history.replaceState({}, '', '/verify');

		authState.user = { team_id: null };

		vi.mocked(completeVerifiedRegistration).mockResolvedValue(undefined);
		vi.mocked(loadUser).mockResolvedValue(undefined);
	});

	it('auto-completes verification from the email link when pending signup data exists', async () => {
		sessionStorage.setItem(
			'pending-signup',
			JSON.stringify({
				email: 'tester@example.com',
				name: 'tester',
				password: 'password123'
			})
		);
		window.history.replaceState({}, '', '/verify?token=test-token');

		renderWithProviders(Page);

		await waitFor(() =>
			expect(completeVerifiedRegistration).toHaveBeenCalledWith(
				'test-token',
				'tester',
				'password123'
			)
		);

		expect(loadUser).toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/team');
		expect(sessionStorage.getItem('pending-signup')).toBeNull();
	});

	it('lets the user finish verification manually without pending signup data', async () => {
		window.history.replaceState({}, '', '/verify?token=test-token');
		const user = userEvent.setup();

		renderWithProviders(Page);

		await user.type(screen.getByLabelText(/username/i), 'tester');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.type(screen.getByLabelText(/confirm password/i), 'password123');
		await user.click(screen.getByRole('button', { name: /complete sign up/i }));

		await waitFor(() =>
			expect(completeVerifiedRegistration).toHaveBeenCalledWith(
				'test-token',
				'tester',
				'password123'
			)
		);

		expect(loadUser).toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/team');
	});

	it('shows backend verification errors to the user', async () => {
		vi.mocked(completeVerifiedRegistration).mockRejectedValue(new Error('Invalid user name'));
		window.history.replaceState({}, '', '/verify?token=test-token');
		const user = userEvent.setup();

		renderWithProviders(Page);

		await user.type(screen.getByLabelText(/username/i), 'bad\u200bname');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.type(screen.getByLabelText(/confirm password/i), 'password123');
		await user.click(screen.getByRole('button', { name: /complete sign up/i }));

		await waitFor(() => expect(screen.getByText('Invalid user name')).toBeInTheDocument());
		expect(toast.error).toHaveBeenCalledWith('Invalid user name');
	});
});
