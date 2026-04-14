import { screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../../render';
import Page from '../../../../../src/routes/admin/categories/+page.svelte';
import { createCategory, deleteCategory, getCategories, updateCategory } from '$lib/categories';

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$lib/categories', () => ({
	createCategory: vi.fn(),
	deleteCategory: vi.fn(),
	getCategories: vi.fn(),
	updateCategory: vi.fn()
}));

describe('Admin Categories Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCategories).mockResolvedValue(['Web', 'Crypto']);
		vi.mocked(createCategory).mockResolvedValue(undefined);
		vi.mocked(deleteCategory).mockResolvedValue(undefined);
		vi.mocked(updateCategory).mockResolvedValue(undefined);
	});

	it('renders category names returned by the backend', async () => {
		renderWithProviders(Page);

		await waitFor(() => {
			expect(getCategories).toHaveBeenCalledTimes(1);
		});

		expect(await screen.findByText('Crypto')).toBeInTheDocument();
		expect(screen.getByText('Web')).toBeInTheDocument();
	});
});
