import { screen, waitFor, fireEvent } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DeleteChallengeDialog from '$lib/components/challenges/DeleteChallengeDialog.svelte';

describe('DeleteChallengeDialog Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders dialog title', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test Challenge' },
				deleting: false
			}
		});
		expect(await screen.findByText('Delete challenge?')).toBeInTheDocument();
	});

	it('displays challenge name in description', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'My Test Challenge' },
				deleting: false
			}
		});
		// The name appears in a <b> tag within the description
		const descriptionText = await screen.findByText(/you're about to permanently delete/i);
		expect(descriptionText).toBeInTheDocument();

		// Check that the challenge name is in the document
		const challengeName = (await screen.findAllByText(/my test challenge/i))[0];
		expect(challengeName).toBeInTheDocument();
	});

	it('shows warning text about permanent deletion', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByText(/this action cannot be undone/i)).toBeInTheDocument();
	});

	it('shows warning about related data removal', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByText(/all related data.*may be removed/i)).toBeInTheDocument();
	});

	it('displays confirmation prompt text', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByText(/to confirm, type the following text/i)).toBeInTheDocument();
	});

	it('shows expected confirmation text', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Web Challenge' },
				deleting: false
			}
		});
		expect(await screen.findByText("Yes, I want to delete 'Web Challenge'")).toBeInTheDocument();
	});

	it('renders confirmation input field', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByLabelText(/confirmation/i)).toBeInTheDocument();
	});

	it('renders cancel button', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		const cancelButtons = await screen.findAllByRole('button', { name: /cancel/i });
		// There might be multiple due to Dialog.Close wrapper
		expect(cancelButtons.length).toBeGreaterThan(0);
	});

	it('renders delete button', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByRole('button', { name: /^delete$/i })).toBeInTheDocument();
	});

	it('delete button is disabled initially', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test Challenge' },
				deleting: false
			}
		});

		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		expect(deleteButton).toBeDisabled();
	});

	it('delete button is disabled when confirmation text is incorrect', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		await fireEvent.input(input, { target: { value: 'wrong text' } });

		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		expect(deleteButton).toBeDisabled();
	});

	it('delete button is enabled when confirmation text matches exactly', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test Challenge' },
				deleting: false
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		const expectedText = "Yes, I want to delete 'Test Challenge'";
		await fireEvent.input(input, { target: { value: expectedText } });
		await tick();

		// Wait for the button to become enabled
		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		await waitFor(() => {
			expect(deleteButton).not.toBeDisabled();
		});
	});

	it('calls onconfirm when delete button clicked with correct text', async () => {
		const handleConfirm = vi.fn();

		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false,
				onconfirm: handleConfirm
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		await fireEvent.input(input, { target: { value: "Yes, I want to delete 'Test'" } });
		await tick();

		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		await waitFor(() => {
			expect(deleteButton).not.toBeDisabled();
		});

		// Use fireEvent to sidestep pointer-events/body-scroll-lock weirdness
		await fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(handleConfirm).toHaveBeenCalledTimes(1);
		});
	});

	it('shows spinner and "Deleting..." text when deleting is true', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: true
			}
		});

		expect(await screen.findByText(/deleting/i)).toBeInTheDocument();
	});

	it('disables input when deleting is true', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: true
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		expect(input).toBeDisabled();
	});

	it('disables cancel button when deleting is true', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: true
			}
		});

		const cancelButtons = await screen.findAllByRole('button', { name: /cancel/i });
		// At least one cancel button should be disabled
		const disabledButton = cancelButtons.find((btn) => btn.hasAttribute('disabled'));
		expect(disabledButton).toBeDefined();
	});

	it('disables delete button when deleting is true', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: true
			}
		});

		const deleteButton = await screen.findByRole('button', { name: /deleting/i });
		expect(deleteButton).toBeDisabled();
	});

	it('confirmation text is case-sensitive', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		// Wrong case
		await fireEvent.input(input, { target: { value: "yes, i want to delete 'Test'" } });

		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		expect(deleteButton).toBeDisabled();
	});

	it('confirmation requires exact punctuation', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		const input = await screen.findByLabelText(/confirmation/i);
		// Missing comma
		await fireEvent.input(input, { target: { value: "Yes I want to delete 'Test'" } });

		const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
		expect(deleteButton).toBeDisabled();
	});

	it('handles challenge name with special characters in confirmation', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test\'s "Challenge" & More' },
				deleting: false
			}
		});

		expect(
			await screen.findByText("Yes, I want to delete 'Test's \"Challenge\" & More'")
		).toBeInTheDocument();
	});

	it('shows placeholder text in input field', async () => {
		renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		expect(await screen.findByPlaceholderText(/type here to confirm/i)).toBeInTheDocument();
	});

	it('clears confirmation text when dialog is closed and reopened', async () => {
		const { rerender } = renderWithProviders(DeleteChallengeDialog, {
			props: {
				open: true,
				toDelete: { name: 'Test' },
				deleting: false
			}
		});

		await waitFor(() => {
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		const input = await screen.findByLabelText(/confirmation/i);
		await fireEvent.input(input, { target: { value: 'some text' } });

		expect(input).toHaveValue('some text');

		// Close dialog
		await rerender({ open: false, toDelete: { name: 'Test' }, deleting: false });

		// Reopen dialog
		await rerender({ open: true, toDelete: { name: 'Test' }, deleting: false });

		// Should now be empty
		await waitFor(async () => {
			const newInput = await screen.findByLabelText(/confirmation/i);
			expect(newInput).toHaveValue('');
		}, { timeout: 3000 });
	});
});
