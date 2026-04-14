import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChallengeCard from '$lib/components/challenges/ChallengeCard.svelte';

function makeChallenge(overrides = {}) {
	return {
		id: 1,
		name: 'Test Challenge',
		points: 100,
		tags: ['web', 'crypto'],
		solved: false,
		hidden: false,
		instance: false,
		...overrides
	};
}

describe('ChallengeCard Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders challenge name and points in grid view', () => {
		const challenge = makeChallenge({ name: 'Test Challenge', points: 250 });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText('Test Challenge')).toBeInTheDocument();
		expect(screen.getByText('250 pts')).toBeInTheDocument();
	});

	it('renders challenge name and points correctly (always shows "N pts")', () => {
		const challenge = makeChallenge({ name: 'Compact Challenge', points: 150 });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText('Compact Challenge')).toBeInTheDocument();
		expect(screen.getByText('150 pts')).toBeInTheDocument();
	});

	it('displays all tags', () => {
		const challenge = makeChallenge({ tags: ['web', 'pwn', 'forensics'] });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText('web')).toBeInTheDocument();
		expect(screen.getByText('pwn')).toBeInTheDocument();
		expect(screen.getByText('forensics')).toBeInTheDocument();
	});

	it('applies solved styling when challenge is solved (emerald background)', () => {
		const challenge = makeChallenge({ solved: true });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		const button = screen.getByRole('button');
		expect(button.className).toMatch(/bg-\[#05100a\]/);
	});

	it('does not apply solved styling when challenge is not solved', () => {
		const challenge = makeChallenge({ solved: false });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		const button = screen.getByRole('button');
		expect(button.className).not.toMatch(/emerald/);
	});

	it('does not show instance icon for non-instance challenges', () => {
		const challenge = makeChallenge({ instance: false });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		// No instance-related elements shown on card
		expect(screen.queryByText(/running/i)).not.toBeInTheDocument();
	});

	it('does not display countdown when countdown is 0', () => {
		const challenge = makeChallenge({ instance: true });

		renderWithProviders(ChallengeCard, {
			props: { challenge, countdown: 0, onclick: vi.fn() }
		});

		// Countdown=0 means no active instance → no timer text
		expect(screen.queryByText(/:\d{2}/)).not.toBeInTheDocument();
	});

	it('calls onclick handler when clicked', async () => {
		const user = userEvent.setup();
		const mockOnclick = vi.fn();
		const challenge = makeChallenge({ name: 'Clickable Challenge' });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: mockOnclick }
		});

		const button = screen.getByRole('button');
		await user.click(button);
		expect(mockOnclick).toHaveBeenCalledTimes(1);
	});

	it('has proper accessibility label based on challenge name', () => {
		const challenge = makeChallenge({ name: 'Test Challenge', points: 100 });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(
			screen.getByRole('button', { name: /view details for test challenge/i })
		).toBeInTheDocument();
	});

	it('does not has instance icon', () => {
		const challenge = makeChallenge({ instance: false });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.queryByLabelText(/instance/i)).not.toBeInTheDocument();
	});

	it('accessibility label includes challenge name when solved', () => {
		const challenge = makeChallenge({ name: 'Solved Challenge', solved: true });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(
			screen.getByRole('button', { name: /view details for solved challenge/i })
		).toBeInTheDocument();
	});

	it('has proper accessibility label when compact (same label regardless)', () => {
		const challenge = makeChallenge({ name: 'Compact Test', points: 50 });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(
			screen.getByRole('button', { name: /view details for compact test/i })
		).toBeInTheDocument();
	});

	it('applies solved styling (emerald) in any view', () => {
		const challenge = makeChallenge({ solved: true });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		const button = screen.getByRole('button');
		expect(button.className).toMatch(/bg-\[#05100a\]/);
		expect(button.className).toMatch(/dark:bg-\[#05100a\]/);
	});

	it('applies unsolved/default styling when not solved', () => {
		const challenge = makeChallenge({ solved: false });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		const button = screen.getByRole('button');
		// Not solved → no emerald, uses default card style
		expect(button.className).not.toMatch(/bg-emerald/);
		expect(button.className).toMatch(/bg-\[#fafafa\]/);
	});

	it('shows solves count when solves is provided', () => {
		const challenge = makeChallenge({ solves: 42 });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.getByText(/42 Solves/i)).toBeInTheDocument();
	});

	it('hides solves count when solves is undefined', () => {
		const challenge = makeChallenge({ solves: undefined });

		renderWithProviders(ChallengeCard, {
			props: { challenge, onclick: vi.fn() }
		});

		expect(screen.queryByText(/Solves/i)).not.toBeInTheDocument();
	});
});
