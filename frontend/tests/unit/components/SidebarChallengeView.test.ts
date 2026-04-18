import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SidebarChallengeView from '../../../src/lib/components/challenges/SidebarChallengeView.svelte';
import { uiStore } from '$lib/stores/ui.svelte';

vi.mock('$lib/stores/ui.svelte', () => ({
	uiStore: {
		challengeView: 'sidebar',
		setChallengeView: vi.fn()
	}
}));

vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: { role: 'User' }
	}
}));

vi.mock('$lib/challenges', () => ({
	getSolves: vi.fn(() => Promise.resolve([]))
}));

vi.mock('$lib/env', () => ({
	config: {}
}));

const groupedMock: any = [
	[
		'Web',
		[
			{ id: 1, name: 'Web Chall 1', points: 100, tags: [] },
			{ id: 2, name: 'Web Chall 2', points: 200, tags: [] }
		]
	]
];

describe('SidebarChallengeView', () => {
	beforeEach(() => {
		uiStore.setChallengeView('sidebar');
		window.history.replaceState({}, '', '/challenges');
		window.location.hash = '';
	});

	it('selects the first challenge by default', async () => {
		render(SidebarChallengeView, { grouped: groupedMock });

		const heading1 = await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' });
		expect(heading1).toBeInTheDocument();
	});

	it('ignores URL hash on load', async () => {
		window.location.hash = '#challenge-2';
		render(SidebarChallengeView, { grouped: groupedMock });

		const heading1 = await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' });
		expect(heading1).toBeInTheDocument();
		expect(window.location.hash).toBe('#challenge-2');
	});

	it('switches between challenges without changing the URL hash', async () => {
		window.location.hash = '#stale-fragment';
		render(SidebarChallengeView, { grouped: groupedMock });

		expect(await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /web chall 2/i }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Web Chall 2' })).toBeInTheDocument();
		expect(window.location.hash).toBe('#stale-fragment');

		await fireEvent.click(screen.getByRole('button', { name: /web chall 1/i }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' })).toBeInTheDocument();
		expect(window.location.hash).toBe('#stale-fragment');
	});
});
