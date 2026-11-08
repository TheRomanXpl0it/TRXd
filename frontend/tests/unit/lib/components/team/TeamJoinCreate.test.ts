import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { describe, it, expect } from 'vitest';
import TeamJoinCreate from '$lib/components/team/TeamJoinCreate.svelte';

describe('TeamJoinCreate Component', () => {
	it('renders join and create navigation cards with correct links', () => {
		renderWithProviders(TeamJoinCreate);

		expect(screen.getByRole('heading', { name: 'Join Existing Team' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Create New Team' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Join Team' })).toHaveAttribute('href', '/team/join');
		expect(screen.getByRole('link', { name: 'Create Team' })).toHaveAttribute('href', '/team/create');
	});
});
