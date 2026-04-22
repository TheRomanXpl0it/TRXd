import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	register,
	requestRegistrationVerification,
	completeVerifiedRegistration,
	loadUser,
	goto,
	toast,
	authState
} = vi.hoisted(() => ({
	register: vi.fn(),
	requestRegistrationVerification: vi.fn(),
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
		emailVerification: false,
		startTime: null,
		endTime: null
	}
}));

vi.mock('$lib/auth', () => ({
	register,
	requestRegistrationVerification,
	completeVerifiedRegistration
}));

vi.mock('@/stores/auth', () => ({
	authState,
	loadUser
}));

vi.mock('$app/navigation', () => ({
	goto
}));

vi.mock('svelte-sonner', () => ({
	toast
}));

import { renderWithProviders } from '../../render';
import Page from '../../../../src/routes/signUp/+page.svelte';

describe('Sign Up Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		window.history.replaceState({}, '', '/signUp');

		authState.user = { team_id: null };
		authState.emailVerification = false;

		vi.mocked(register).mockResolvedValue(undefined);
		vi.mocked(requestRegistrationVerification).mockResolvedValue(undefined);
		vi.mocked(completeVerifiedRegistration).mockResolvedValue(undefined);
		vi.mocked(loadUser).mockResolvedValue(undefined);
	});

	it('requests a verification email before account creation when email verification is enabled', async () => {
		authState.emailVerification = true;
		const user = userEvent.setup();

		renderWithProviders(Page);

		await user.type(screen.getByLabelText(/^email$/i), 'tester@example.com');
		await user.click(screen.getByRole('button', { name: /send verification email/i }));

		await waitFor(() =>
			expect(requestRegistrationVerification).toHaveBeenCalledWith('tester@example.com')
		);

		expect(register).not.toHaveBeenCalled();
		expect(loadUser).not.toHaveBeenCalled();
		expect(sessionStorage.getItem('pending-signup')).toContain('tester@example.com');
		expect(screen.getByText(/verification email sent to/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /complete sign up/i })).toBeInTheDocument();
	});

	it('restores pending signup data so the user can complete verification manually', async () => {
		authState.emailVerification = true;
		sessionStorage.setItem(
			'pending-signup',
			JSON.stringify({
				email: 'tester@example.com',
				name: 'tester',
				password: 'password123'
			})
		);
		const user = userEvent.setup();
		renderWithProviders(Page);

		await waitFor(() =>
			expect(screen.getByRole('button', { name: /complete sign up/i })).toBeInTheDocument()
		);

		expect(screen.getByDisplayValue('tester')).toBeInTheDocument();
		expect(screen.getByDisplayValue('tester@example.com')).toBeDisabled();
		await user.type(screen.getByLabelText(/verification token/i), 'test-token');

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
		expect(sessionStorage.getItem('pending-signup')).toBeNull();
		expect(window.location.search).toBe('');
	});

	it('keeps the one-step registration flow when email verification is disabled', async () => {
		const user = userEvent.setup();

		renderWithProviders(Page);

		await user.type(screen.getByLabelText(/username/i), 'tester');
		await user.type(screen.getByLabelText(/^email$/i), 'tester@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.type(screen.getByLabelText(/confirm password/i), 'password123');
		await user.click(screen.getByRole('button', { name: /^sign up$/i }));

		await waitFor(() =>
			expect(register).toHaveBeenCalledWith('tester@example.com', 'password123', 'tester')
		);

		expect(requestRegistrationVerification).not.toHaveBeenCalled();
		expect(completeVerifiedRegistration).not.toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/team');
	});

	it('shows backend signup errors to the user', async () => {
		vi.mocked(register).mockRejectedValue(new Error('Invalid user name'));
		const user = userEvent.setup();

		renderWithProviders(Page);

		await user.type(screen.getByLabelText(/username/i), 'bad\u200bname');
		await user.type(screen.getByLabelText(/^email$/i), 'tester@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.type(screen.getByLabelText(/confirm password/i), 'password123');
		await user.click(screen.getByRole('button', { name: /^sign up$/i }));

		await waitFor(() => expect(screen.getByText('Invalid user name')).toBeInTheDocument());
		expect(toast.error).toHaveBeenCalledWith('Invalid user name');
	});
});
