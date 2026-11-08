import { screen, fireEvent } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import AccountScoreboard from '$lib/components/account/AccountScoreboard.svelte';

const solves = [
	{ id: 1, name: 'X', category: 'Web', points: 50, timestamp: '2024-01-02T00:00:00Z' },
	{ id: 2, name: 'Y', category: 'Pwn', points: 150, timestamp: '2024-01-01T00:00:00Z' }
];

describe('AccountScoreboard', () => {
	it('sorts by clicking headers', async () => {
		renderWithProviders(AccountScoreboard, { props: { solves } });

		await tick();

		// Initially sorted by timestamp desc: X (newer) before Y (older)
		let rows = screen.getAllByRole('row');
		expect(rows[1]).toHaveTextContent('X');
		expect(rows[2]).toHaveTextContent('Y');

		// Click points header -> sorts asc by points (X: 50, Y: 150)
		const pointsHeader = screen.getByText(/points/i);
		await fireEvent.click(pointsHeader);
		await tick();

		// Click points header again -> sorts desc by points (Y: 150, X: 50)
		await fireEvent.click(pointsHeader);
		await tick();

		rows = screen.getAllByRole('row');
		expect(rows[1]).toHaveTextContent('Y');
		expect(rows[2]).toHaveTextContent('X');
	});
});
