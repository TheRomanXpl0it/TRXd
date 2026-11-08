import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';
import { describe, it, expect } from 'vitest';
import NotFound from '$lib/components/NotFound.svelte';

describe('NotFound Component', () => {
	it('renders 404 message and navigation links', () => {
		renderWithProviders(NotFound);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/page not found/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
		expect(screen.getByRole('link', { name: /view challenges/i })).toHaveAttribute('href', '/challenges');
		expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
	});
});
