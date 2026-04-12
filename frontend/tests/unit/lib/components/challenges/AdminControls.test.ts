import { screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'svelte-sonner';
import AdminControls from '$lib/components/challenges/AdminControls.svelte';
import { createCategory } from '$lib/categories';

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$lib/categories', () => ({
	createCategory: vi.fn()
}));

describe('AdminControls Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders create challenge button', () => {
		renderWithProviders(AdminControls);

		expect(screen.getByRole('button', { name: /create challenge/i })).toBeInTheDocument();
	});

	it('renders new category button', () => {
		renderWithProviders(AdminControls);

		expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument();
	});

	it('calls oncreate callback when create challenge button is clicked', async () => {
		const user = userEvent.setup();
		const handleOpenCreate = vi.fn();

		renderWithProviders(AdminControls, {
			props: {
				'onopen-create': handleOpenCreate
			}
		});

		const createButton = await screen.findByRole('button', { name: /create challenge/i });
		await user.click(createButton);

		expect(handleOpenCreate).toHaveBeenCalledTimes(1);
	});

	it('opens popover when new category button is clicked', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		const categoryButton = screen.getByRole('button', { name: /new category/i });
		await user.click(categoryButton);

		// Popover content should be visible
		expect(await screen.findByLabelText(/category name/i)).toBeInTheDocument();
	});

	it('displays category name input in popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));

		expect(await screen.findByLabelText(/category name/i)).toBeInTheDocument();
	});

	it('displays cancel and create buttons in popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		await user.click(await screen.findByRole('button', { name: /new category/i }));
		await tick();

		expect(await screen.findByText('Cancel', { selector: 'button' })).toBeInTheDocument();
		expect(await screen.findByText(/^create$/i, { selector: 'button' })).toBeInTheDocument();
	});

	it('create button is disabled when category name is empty', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		expect(createButton).toBeDisabled();
	});

	it('create button is enabled when category name field is filled', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Web');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		expect(createButton).not.toBeDisabled();
	});

	it('closes popover when cancel is clicked', async () => {
		const user = userEvent.setup();

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const cancelButton = await screen.findByText('Cancel', { selector: 'button' });
		await user.click(cancelButton);
		await tick();
		await tick();

		await waitFor(() => {
			expect(screen.queryByLabelText(/category name/i)).not.toBeInTheDocument();
		});
	});

	it('creates category successfully', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Forensics');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(mockCreateCategory).toHaveBeenCalledWith('Forensics');
		});
	});

	it('shows success toast after creating category', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		const mockToast = vi.mocked(toast);
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Crypto');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/created successfully/i));
		}, { timeout: 4000 });
	});

	it('calls oncategory-created callback after successful creation', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		const handleCategoryCreated = vi.fn();
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls, {
			props: {
				'oncategory-created': handleCategoryCreated
			}
		});

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Pwn');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(handleCategoryCreated).toHaveBeenCalledTimes(1);
		});
	});

	it('closes popover after successful creation', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Rev');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();
		await tick();

		await waitFor(() => {
			expect(screen.queryByLabelText(/category name/i)).not.toBeInTheDocument();
		});
	});

	it('clears form after successful creation', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		let nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'OSINT');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();
		await tick();

		// Wait for popover to close
		await waitFor(() => {
			expect(screen.queryByLabelText(/category name/i)).not.toBeInTheDocument();
		});

		// Reopen and check fields are empty
		await user.click(screen.getByRole('button', { name: /new category/i }));

		nameInput = await screen.findByLabelText(/category name/i);
		expect(nameInput).toHaveValue('');
	});

	it('shows error toast when creation fails', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		const mockToast = vi.mocked(toast);
		mockCreateCategory.mockRejectedValueOnce(new Error('API error'));

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Web');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith('API error');
		});
	});

	it('shows generic error message when error has no message', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		const mockToast = vi.mocked(toast);
		mockCreateCategory.mockRejectedValueOnce({});

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Misc');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith('Failed to create category.');
		});
	});

	it('shows error toast when name is empty on submit', async () => {
		const mockToast = vi.mocked(toast);

		renderWithProviders(AdminControls);

		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: /new category/i }));

		const nameInput = await screen.findByLabelText(/category name/i);

		// Manually trigger form submission (button should be disabled but test the logic)
		const form = nameInput.closest('form');
		if (form) {
			form.dispatchEvent(new Event('submit', { cancelable: true }));
		}

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith('Category name is required.');
		}, { timeout: 3000 });
	});

	it('trims whitespace from category name', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		mockCreateCategory.mockResolvedValueOnce(undefined);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, '  Web  ');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();

		await waitFor(() => {
			expect(mockCreateCategory).toHaveBeenCalledWith('Web');
		});
	});

	it('shows loading state during category creation', async () => {
		const user = userEvent.setup();
		const mockCreateCategory = vi.mocked(createCategory);
		
		// Create a promise we can control
		let resolveCreate: () => void;
		const createPromise = new Promise<void>((resolve) => {
			resolveCreate = resolve;
		});
		mockCreateCategory.mockReturnValueOnce(createPromise);

		renderWithProviders(AdminControls);

		await user.click(screen.getByRole('button', { name: /new category/i }));
		await tick();

		const nameInput = await screen.findByLabelText(/category name/i);
		await user.type(nameInput, 'Test');
		await tick();

		const createButton = await screen.findByText(/^create$/i, { selector: 'button' });
		await user.click(createButton);
		await tick();
		await tick();

		// Button should be disabled during loading
		await waitFor(() => {
			expect(createButton).toBeDisabled();
		});

		// Resolve the promise
		resolveCreate!();
	});
});
