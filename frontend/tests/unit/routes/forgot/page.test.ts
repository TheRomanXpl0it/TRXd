import { screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../render';
import Page from '../../../../src/routes/forgot/+page.svelte';

describe('Forgot Password Page', () => {
	it('renders the recovery notice and navigation links', () => {
		renderWithProviders(Page);

		expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
		expect(screen.getByText('Automatic password recovery is not available yet.')).toBeInTheDocument();
		expect(
			screen.getByText(/contact the event organizer or platform administrator/i)
		).toBeInTheDocument();

		expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
			'href',
			'/signIn'
		);
		expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute(
			'href',
			'/signUp'
		);
	});
});
