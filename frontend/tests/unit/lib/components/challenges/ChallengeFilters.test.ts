import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChallengeFilters from '$lib/components/challenges/ChallengeFilters.svelte';

describe('ChallengeFilters Component', () => {
	const defaultProps = {
		search: '',
		filterCategories: [],
		filterTags: [],
		categories: [
			{ value: 'web', label: 'Web' },
			{ value: 'crypto', label: 'Crypto' },
			{ value: 'pwn', label: 'Pwn' }
		],
		allTags: ['easy', 'medium', 'hard'],
		activeFiltersCount: 0
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders search input with correct aria-label', async () => {
		renderWithProviders(ChallengeFilters, { props: defaultProps });

		const searchInput = await screen.findByRole('textbox', { name: /search challenges/i });
		expect(searchInput).toBeInTheDocument();
	});

	it('updates search value when typing', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, search: '' }
		});

		const searchInput = await screen.findByRole('textbox', { name: /search challenges/i });
		await user.type(searchInput, 'test challenge');

		expect(searchInput).toHaveValue('test challenge');
	});

	it('shows clear search button when search has value', async () => {
		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, search: 'test' }
		});

		const clearButton = await screen.findByRole('button', { name: /clear search/i });
		expect(clearButton).toBeInTheDocument();
	});

	it('does not show clear search button when search is empty', async () => {
		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, search: '' }
		});

		// Wait for component to fully render, then check absence
		await screen.findByRole('textbox', { name: /search challenges/i });
		const clearButton = screen.queryByRole('button', { name: /clear search/i });
		expect(clearButton).not.toBeInTheDocument();
	});

	it('clears search when clear button is clicked', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, search: 'test search' }
		});

		const clearButton = await screen.findByRole('button', { name: /clear search/i });
		await user.click(clearButton);

		const searchInput = await screen.findByRole('textbox', { name: /search challenges/i });
		expect(searchInput).toHaveValue('');
	});

	it('renders categories filter button', async () => {
		renderWithProviders(ChallengeFilters, { props: defaultProps });

		expect(await screen.findByRole('button', { name: /filter by categories/i })).toBeInTheDocument();
	});

	it('renders tags filter button', async () => {
		renderWithProviders(ChallengeFilters, { props: defaultProps });

		expect(await screen.findByRole('button', { name: /filter by tags/i })).toBeInTheDocument();
	});

	it('shows clear filters button when activeFiltersCount > 0', async () => {
		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, activeFiltersCount: 3 }
		});

		expect(
			await screen.findByRole('button', { name: /clear all filters \(3 active\)/i })
		).toBeInTheDocument();
	});

	it('does not show clear filters button when activeFiltersCount is 0', async () => {
		renderWithProviders(ChallengeFilters, {
			props: { ...defaultProps, activeFiltersCount: 0 }
		});

		// Wait for component to fully render
		await screen.findByRole('textbox', { name: /search challenges/i });
		expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
	});

	it('renders all available categories in categories popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, { props: defaultProps });

		const categoriesButton = await screen.findByRole('button', { name: /filter by categories/i });
		await user.click(categoriesButton);

		expect(await screen.findByText('Web')).toBeInTheDocument();
		expect(await screen.findByText('Crypto')).toBeInTheDocument();
		expect(await screen.findByText('Pwn')).toBeInTheDocument();
	});

	it('renders all available tags in tags popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, { props: defaultProps });

		const tagsButton = await screen.findByRole('button', { name: /filter by tags/i });
		await user.click(tagsButton);

		expect(await screen.findByText('easy')).toBeInTheDocument();
		expect(await screen.findByText('medium')).toBeInTheDocument();
		expect(await screen.findByText('hard')).toBeInTheDocument();
	});

	it('has search input in categories popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, { props: defaultProps });

		const categoriesButton = await screen.findByRole('button', { name: /filter by categories/i });
		await user.click(categoriesButton);

		expect(await screen.findByPlaceholderText(/search categories/i)).toBeInTheDocument();
	});

	it('has search input in tags popover', async () => {
		const user = userEvent.setup();

		renderWithProviders(ChallengeFilters, { props: defaultProps });

		const tagsButton = await screen.findByRole('button', { name: /filter by tags/i });
		await user.click(tagsButton);

		expect(await screen.findByPlaceholderText(/search tags/i)).toBeInTheDocument();
	});
});
