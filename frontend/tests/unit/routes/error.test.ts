import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../render';
import { describe, it, expect, vi } from 'vitest';
import { readable } from 'svelte/store';
import ErrorPage from '../../../src/routes/+error.svelte';

vi.mock('$app/stores', () => ({
	page: readable({
		status: 404,
		error: { message: 'Not found' }
	})
}));

describe('+error.svelte', () => {
	it('renders 404 error page with navigation links', () => {
		renderWithProviders(ErrorPage);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/page not found/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /view challenges/i })).toHaveAttribute('href', '/challenges');
		expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
		expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
	});
});
