import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';
import { describe, it, expect } from 'vitest';
import NotFound from '$lib/components/NotFound.svelte';

describe('NotFound Component', () => {
	it('renders 404 error message', () => {
		renderWithProviders(NotFound);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/page not found/i)).toBeInTheDocument();
	});

	it('renders navigation buttons', () => {
		renderWithProviders(NotFound);

		expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /view challenges/i })).toBeInTheDocument();
	});

	it('has correct link to home page', () => {
		renderWithProviders(NotFound);

		const homeLink = screen.getByRole('link', { name: /back to home/i });
		expect(homeLink).toHaveAttribute('href', '#/');
	});

	it('has correct link to challenges page', () => {
		renderWithProviders(NotFound);

		const challLink = screen.getByRole('link', { name: /view challenges/i });
		expect(challLink).toHaveAttribute('href', '#/challenges');
	});

	it('renders both links as clickable elements', () => {
		renderWithProviders(NotFound);

		const homeLink = screen.getByRole('link', { name: /back to home/i });
		const challLink = screen.getByRole('link', { name: /view challenges/i });

		expect(homeLink).toBeInTheDocument();
		expect(challLink).toBeInTheDocument();
		expect(homeLink.tagName).toBe('A');
		expect(challLink.tagName).toBe('A');
	});
});
