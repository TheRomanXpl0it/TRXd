import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { describe, it, expect } from 'vitest';
import TeamJoinCreate from '$lib/components/team/TeamJoinCreate.svelte';

describe('TeamJoinCreate Component', () => {
	it('renders join and create links', () => {
		renderWithProviders(TeamJoinCreate);

		expect(screen.getByRole('link', { name: 'Join Team' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Create Team' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Join Existing Team' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Create New Team' })).toBeInTheDocument();
	});

	it('routes the join card to the join page', () => {
		renderWithProviders(TeamJoinCreate);

		expect(screen.getByRole('link', { name: 'Join Team' })).toHaveAttribute('href', '/team/join');
	});

	it('routes the create card to the create page', () => {
		renderWithProviders(TeamJoinCreate);

		expect(screen.getByRole('link', { name: 'Create Team' })).toHaveAttribute(
			'href',
			'/team/create'
		);
	});
});
