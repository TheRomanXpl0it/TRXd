import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategorySelect from '$lib/components/challenges/CategorySelect.svelte';

import { tick } from 'svelte';

describe('CategorySelect Component', () => {
	const categories = [
		{ value: 'web', label: 'Web' },
		{ value: 'crypto', label: 'Cryptography' },
		{ value: 'pwn', label: 'Binary Exploitation' },
		{ value: 'forensics', label: 'Forensics' },
		{ value: 'rev', label: 'Reverse Engineering' }
	];

	beforeEach(() => {
		Element.prototype.scrollIntoView = function () { };
	});

	it('renders with placeholder text', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				placeholder: 'Select a category...'
			}
		});

		expect(screen.getByRole('combobox')).toBeInTheDocument();
		expect(screen.getByText('Select a category...')).toBeInTheDocument();
	});

	it('displays selected category label', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'crypto'
			}
		});

		expect(screen.getByText('Cryptography')).toBeInTheDocument();
	});

	it('opens popover when button is clicked', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		await user.click(button);

		expect(await screen.findByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
	});

	it('displays all category items in popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByText('Web', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Cryptography', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Binary Exploitation', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Forensics', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Reverse Engineering', {}, { timeout: 2000 })).toBeInTheDocument();
	});

	it('shows search input in popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Search category...'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByPlaceholderText('Search category...')).toBeInTheDocument();
	});

	it('filters items based on search input', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Search...'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const searchInput = await screen.findByPlaceholderText('Search...');
		await user.type(searchInput, 'Crypto');
		await tick();
		await tick();

		expect(await screen.findByText('Cryptography', {}, { timeout: 2000 })).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.queryByText('Web')).not.toBeInTheDocument();
		});
	});

	it('selects category when item is clicked', async () => {
		const user = userEvent.setup();

		let selectedValue = '';

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: selectedValue
			}
		});

		await user.click(await screen.findByRole('combobox'));
		await tick();

		const webItem = await screen.findByText('Web', {}, { timeout: 2000 });
		await user.click(webItem);

		await tick();
		await tick();

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Web');
		}, { timeout: 3000 });
	});

	it('closes popover after selecting item', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		await user.click(button);
		await tick();

		await waitFor(() => {
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});

		await user.click(await screen.findByText('Forensics', {}, { timeout: 2000 }));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
		});
	});

	it('displays selected category after selection', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				placeholder: 'Choose...'
			}
		});

		// Open popover first
		await user.click(screen.getByRole('combobox'));
		await tick();

		await user.click(await screen.findByText('Binary Exploitation', {}, { timeout: 2000 }));

		await tick();
		await tick();

		await waitFor(() => {
			expect(screen.queryByText(/choose/i, { selector: '.text-muted-foreground' })).not.toBeInTheDocument();
			expect(screen.getByRole('combobox')).toHaveTextContent('Binary Exploitation');
		}, { timeout: 3000 });
	});

	it('shows checkmark for selected item', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'rev'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const options = await screen.findAllByRole('option', { hidden: true });
		const revOption = options.find((opt) => opt.textContent?.includes('Reverse Engineering'));
		expect(revOption).toBeTruthy();

		const revIcon = revOption!.querySelector('svg');
		expect(revIcon).toBeTruthy();
		expect(revIcon).not.toHaveClass('text-transparent');

		const otherOptions = options.filter((opt) => opt !== revOption);
		for (const opt of otherOptions) {
			const icon = opt.querySelector('svg');
			if (icon) {
				expect(icon).toHaveClass('text-transparent');
			}
		}
	});

	it('opens popover with keyboard (Enter key)', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		button.focus();

		await user.keyboard('{Enter}');

		await waitFor(() => {
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});
	});

	it('closes popover with keyboard (Escape key)', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		await user.click(button);

		await waitFor(() => {
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
		});
	});

	it('returns focus to trigger button after selection', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		await user.click(button); // Open popover
		await tick();
		await user.click(await screen.findByText('Web'));

		await tick();
		await tick();

		await waitFor(() => {
			expect(document.activeElement).toBe(button);
		}, { timeout: 3000 });
	});

	it('shows "No results" when search has no matches', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Search...'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const searchInput = await screen.findByPlaceholderText('Search...');
		await user.type(searchInput, 'xyz123');
		await tick();
		await tick();

		await waitFor(() => {
			expect(screen.getByText(/no results/i)).toBeInTheDocument();
		}, { timeout: 3000 });
	});

	it('uses custom placeholder text', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				placeholder: 'Pick a category'
			}
		});

		expect(screen.getByText('Pick a category')).toBeInTheDocument();
	});

	it('uses custom search placeholder text', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Type to search...'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByPlaceholderText('Type to search...')).toBeInTheDocument();
	});

	it('applies custom width class', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				widthClass: 'w-[300px]'
			}
		});

		const button = screen.getByRole('combobox');
		expect(button).toHaveClass('w-[300px]');
	});

	it('applies custom className', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				className: 'my-custom-class'
			}
		});

		const button = screen.getByRole('combobox');
		expect(button).toHaveClass('my-custom-class');
	});

	it('handles empty items array', () => {
		renderWithProviders(CategorySelect, {
			props: {
				items: [],
				placeholder: 'No categories'
			}
		});

		expect(screen.getByText('No categories')).toBeInTheDocument();
	});

	it('shows "No results" when items array is empty and popover is opened', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: []
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByText('No results.', {}, { timeout: 2000 })).toBeInTheDocument();
	});

	it('allows changing selection multiple times', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'web'
			}
		});

		expect(screen.getByText('Web')).toBeInTheDocument();

		// Change to Crypto
		await user.click(screen.getByRole('combobox'));
		await tick();
		await user.click(await screen.findByText('Cryptography', {}, { timeout: 2000 }));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Cryptography');
		});

		// Change to Forensics
		await user.click(screen.getByRole('combobox'));
		await tick();
		await user.click(await screen.findByText('Forensics', {}, { timeout: 2000 }));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Forensics');
		});
	});

	it('filters are case-insensitive', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Search...'
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const searchInput = await screen.findByPlaceholderText('Search...');
		await user.type(searchInput, 'CRYPTO');
		await tick();
		await tick();

		expect(await screen.findByText('Cryptography', {}, { timeout: 2000 })).toBeInTheDocument();
	});

	it('clears search when popover is reopened', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				searchPlaceholder: 'Search...'
			}
		});

		// Open and search
		await user.click(screen.getByRole('combobox'));
		await tick();
		await tick();

		const searchInput = await screen.findByPlaceholderText('Search...');
		await user.type(searchInput, 'Web');
		await tick();
		await tick();

		// Select an item to close
		await user.click(screen.getByText('Web'));
		await tick();

		// Reopen
		await user.click(screen.getByRole('combobox'));
		await tick();
		await tick();

		const newSearchInput = await screen.findByPlaceholderText('Search...');
		expect(newSearchInput).toHaveValue('');
	});

	it('handles items with special characters in labels', async () => {
		const user = userEvent.setup();

		const specialItems = [
			{ value: 'test1', label: "Category's Name" },
			{ value: 'test2', label: 'Category "Special"' },
			{ value: 'test3', label: 'Category & More' }
		];

		renderWithProviders(CategorySelect, {
			props: {
				items: specialItems
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByText("Category's Name")).toBeInTheDocument();
		expect(await screen.findByText('Category "Special"')).toBeInTheDocument();
		expect(await screen.findByText('Category & More')).toBeInTheDocument();
	});

	it('displays correct number of items', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const options = await screen.findAllByRole('option', { hidden: true });
		expect(options).toHaveLength(categories.length);
	});

	it('maintains selection when reopening popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'crypto'
			}
		});

		// Open popover
		await user.click(screen.getByRole('combobox'));
		await tick();

		const options = await screen.findAllByRole('option', { hidden: true });
		const selectedOption = options.find((opt) => opt.textContent?.includes('Cryptography'));
		const icon = selectedOption?.querySelector('svg');
		expect(icon).not.toHaveClass('text-transparent');

		// Close popover
		await user.keyboard('{Escape}');
		await tick();

		// Reopen popover
		await user.click(screen.getByRole('combobox'));
		await tick();

		const options2 = await screen.findAllByRole('option', { hidden: true });
		const selectedOption2 = options2.find((opt) => opt.textContent?.includes('Cryptography'));
		const icon2 = selectedOption2?.querySelector('svg');
		expect(icon2).not.toHaveClass('text-transparent');
	});

	it('filters out all items when search does not match', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();
		await tick();

		const searchInput = await screen.findByPlaceholderText('Search category...');
		await user.type(searchInput, 'xyz123');
		await tick();
		await tick();
		await tick();

		expect(await screen.findByText('No results.', {}, { timeout: 2000 })).toBeInTheDocument();
		const options = screen.queryAllByRole('option', { hidden: true });
		expect(options).toHaveLength(0);
	});

	it('applies custom group label', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				groupLabel: 'challenge-categories'
			}
		});

		await user.click(screen.getByRole('combobox'));

		// Wait for content to be portal-rendered
		await screen.findByPlaceholderText('Search category...'); // Corrected placeholder mapping

		// The group label is used as the data-value attribute
		const group = document.querySelector(
			'[data-command-group][data-value="challenge-categories"]'
		);
		expect(group).toBeInTheDocument();
	});

	it('handles single item in list', async () => {
		const user = userEvent.setup();

		const singleItem = [{ value: 'web', label: 'Web' }];

		renderWithProviders(CategorySelect, {
			props: {
				items: singleItem
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		const options = await screen.findAllByRole('option', { hidden: true });
		expect(options).toHaveLength(1);
		expect(await screen.findByText('Web')).toBeInTheDocument();
	});

	it('handles very long category labels', async () => {
		const user = userEvent.setup();

		const longLabelItems = [
			{
				value: 'long',
				label: 'This is a very long category name that should still be displayed correctly'
			}
		];

		renderWithProviders(CategorySelect, {
			props: {
				items: longLabelItems
			}
		});

		await user.click(screen.getByRole('combobox'));
		await tick();

		expect(await screen.findByText(
			'This is a very long category name that should still be displayed correctly',
			{},
			{ timeout: 2000 }
		)).toBeInTheDocument();
	});

	it('handles rapid selection changes', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'web'
			}
		});

		// Rapidly change selections
		await user.click(screen.getByRole('combobox'));
		await tick();
		await user.click(await screen.findByText('Cryptography', {}, { timeout: 2000 }));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Cryptography');
		});

		// Change again immediately
		await user.click(screen.getByRole('combobox'));
		await tick();
		await user.click(await screen.findByText('Forensics'));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Forensics');
		});
	});

	it('clears selection state visually', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: 'web',
				placeholder: 'Select...'
			}
		});

		expect(screen.getByText('Web')).toBeInTheDocument();

		// Select another item
		await user.click(screen.getByRole('combobox'));
		await tick();

		await user.click(await screen.findByText('Cryptography'));

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Cryptography');
			expect(screen.queryByText('Web')).not.toBeInTheDocument();
		});
	});
});
