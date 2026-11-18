import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Navbar from '../../../../src/lib/components/Navbar.svelte';

describe('Navbar Users link visibility', () => {
	it('hides Users in Teams mode for normal players while keeping Teams visible', () => {
		render(Navbar, { props: { user: { id: 1, name: 'alice', role: 'Player' }, userMode: false } });

		expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Teams' })).toBeInTheDocument();
	});

	it('shows Users in Teams mode for Author and Admin accounts', () => {
		const { unmount } = render(Navbar, {
			props: { user: { id: 2, name: 'author', role: 'Author' }, userMode: false }
		});
		expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
		unmount();

		render(Navbar, { props: { user: { id: 3, name: 'admin', role: 'Admin' }, userMode: false } });
		expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
	});

	it('shows Users in User mode for logged-in normal players and hides Teams', () => {
		render(Navbar, { props: { user: { id: 1, name: 'alice', role: 'Player' }, userMode: true } });

		expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Teams' })).not.toBeInTheDocument();
	});
});
