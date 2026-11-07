import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
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

	it('opens popover when clicked and displays category options', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories
			}
		});

		const button = screen.getByRole('combobox');
		await user.click(button);
		await tick();

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(await screen.findByText('Web', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Cryptography', {}, { timeout: 2000 })).toBeInTheDocument();
		expect(await screen.findByText('Binary Exploitation', {}, { timeout: 2000 })).toBeInTheDocument();
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

	it('selects category when item is clicked and updates value', async () => {
		const user = userEvent.setup();

		renderWithProviders(CategorySelect, {
			props: {
				items: categories,
				value: ''
			}
		});

		await user.click(await screen.findByRole('combobox'));
		await tick();

		const webItem = await screen.findByText('Web', {}, { timeout: 2000 });
		await user.click(webItem);
		await tick();

		await waitFor(() => {
			expect(screen.getByRole('combobox')).toHaveTextContent('Web');
		}, { timeout: 3000 });
	});
});
