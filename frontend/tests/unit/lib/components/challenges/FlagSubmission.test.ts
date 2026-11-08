import { submitFlag } from '$lib/challenges';
import { toast } from 'svelte-sonner';

import { get } from 'svelte/store';
import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FlagSubmission from '$lib/components/challenges/FlagSubmission.svelte';
import { siteContent } from '$lib/site-content';

// Mock the submitFlag API
vi.mock('$lib/challenges', () => ({
	submitFlag: vi.fn()
}));

// Mock svelte-sonner toast
vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('FlagSubmission Component - User Workflow', () => {
	const initialSiteContent = get(siteContent);
	const challengeId = 42;
	const testFlag = 'TRX{deterministic_test_flag_123}';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		siteContent.set(initialSiteContent);
	});

	it('allows user to submit a correct flag and shows success', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		const mockToast = vi.mocked(toast);
		mockSubmit.mockResolvedValueOnce({ status: 'Correct', first_blood: false });

		const onSolved = vi.fn();
		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved
			}
		});

		const input = screen.getByLabelText(/enter flag/i) as HTMLInputElement;
		await user.click(input);
		await user.paste(testFlag);

		const submitButton = screen.getByRole('button', { name: /submit/i });
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSubmit).toHaveBeenCalledWith(challengeId, testFlag);
		});

		expect(mockToast.success).toHaveBeenCalledWith('Correct flag!');
		expect(mockToast.success).not.toHaveBeenCalledWith('First blood!');
		expect(onSolved).toHaveBeenCalled();

		await waitFor(() => {
			expect(screen.getByText(/challenge solved/i)).toBeInTheDocument();
			expect(screen.queryByLabelText(/enter flag/i)).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
		});
	});

	it('shows first blood toast when challenge is first blood', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		const mockToast = vi.mocked(toast);
		mockSubmit.mockResolvedValueOnce({ status: 'Correct', first_blood: true });

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i);
		await user.click(input);
		await user.paste(testFlag);

		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('First blood!');
		});
		await waitFor(() => {
			expect(screen.getByText(/challenge solved/i)).toBeInTheDocument();
		});
	});

	it('shows error state on wrong flag and clears error when user types', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		const mockToast = vi.mocked(toast);
		mockSubmit.mockResolvedValueOnce({ status: 'Wrong' });

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i) as HTMLInputElement;
		await user.click(input);
		await user.paste('TRX{wrong_flag}');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => {
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(mockToast.error).toHaveBeenCalledWith('Incorrect flag');
		});
		expect(screen.queryByText(/challenge solved/i)).not.toBeInTheDocument();

		// Typing should immediately clear the error
		await user.clear(input);
		await user.type(input, 'T');
		expect(input).toHaveAttribute('aria-invalid', 'false');
	});

	it('trims leading and trailing whitespace from flag before submitting', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		mockSubmit.mockResolvedValueOnce({ status: 'Correct', first_blood: false });

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i);
		await user.click(input);
		await user.paste(`   ${testFlag}   `);

		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => {
			expect(mockSubmit).toHaveBeenCalledWith(challengeId, testFlag);
		});
	});

	it('prevents submission when input is empty', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const submitButton = screen.getByRole('button', { name: /submit/i });
		expect(submitButton).toBeDisabled();

		await user.click(submitButton);
		expect(mockSubmit).not.toHaveBeenCalled();
	});

	it('shows a locked state when submissions are closed', () => {
		const mockSubmit = vi.mocked(submitFlag);

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				submissionsClosed: true,
				onSolved: vi.fn()
			}
		});

		expect(screen.getByText(/flag submissions are closed/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/enter flag/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
		expect(mockSubmit).not.toHaveBeenCalled();
	});

	it('handles API errors gracefully', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		mockSubmit.mockRejectedValueOnce(new Error('Network error'));

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i) as HTMLInputElement;
		await user.click(input);
		await user.paste(testFlag);
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => {
			expect(input).toHaveAttribute('aria-invalid', 'true');
		});
	});

	it('prevents multiple simultaneous submissions', async () => {
		const user = userEvent.setup();
		const mockSubmit = vi.mocked(submitFlag);
		mockSubmit.mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve({ status: 'Correct', first_blood: false }), 50))
		);

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i);
		const submitButton = screen.getByRole('button', { name: /submit/i });

		await user.click(input);
		await user.paste(testFlag);

		await Promise.all([
			user.click(submitButton),
			user.click(submitButton),
			user.click(submitButton)
		]);

		await waitFor(() => {
			expect(mockSubmit).toHaveBeenCalledTimes(1);
		});
	});

	it('displays the configured flag placeholder from siteContent', () => {
		siteContent.update((content) => ({
			...content,
			challenges: { flagPlaceholder: 'FLAG{...}' }
		}));

		renderWithProviders(FlagSubmission, {
			props: {
				challenge: { id: challengeId, solved: false },
				onSolved: vi.fn()
			}
		});

		const input = screen.getByLabelText(/enter flag/i);
		expect(input).toHaveAttribute('placeholder', 'FLAG{...}');
	});
});
