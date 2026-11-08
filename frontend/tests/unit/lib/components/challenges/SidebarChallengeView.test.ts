import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SidebarChallengeView from '$lib/components/challenges/SidebarChallengeView.svelte';
import { uiStore } from '$lib/stores/ui.svelte';
import { authState } from '$lib/stores/auth';

vi.mock('$lib/stores/ui.svelte', () => ({
	uiStore: {
		challengeView: 'sidebar',
		setChallengeView: vi.fn(),
		isCategoryCollapsed: vi.fn(() => false),
		toggleCategory: vi.fn()
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
		authState.user = { role: 'User' } as any;
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

		expect(
			await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' })
		).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /web chall 2/i }));
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Web Chall 2' })
		).toBeInTheDocument();
		expect(window.location.hash).toBe('#stale-fragment');

		await fireEvent.click(screen.getByRole('button', { name: /web chall 1/i }));
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Web Chall 1' })
		).toBeInTheDocument();
		expect(window.location.hash).toBe('#stale-fragment');
	});

	it.each(['Author', 'Player'])(
		'restricts sidebar author tag search to privileged roles: %s',
		async (role) => {
			authState.user = { role } as any;
			render(SidebarChallengeView, {
				grouped: [
					[
						'Web',
						[
							{ id: 1, name: 'Web One', tags: [], author_tags: ['review'] },
							{ id: 2, name: 'Web Two', tags: [] }
						]
					]
				] as any
			});

			await fireEvent.input(screen.getByPlaceholderText(/search/i), {
				target: { value: 'review' }
			});
			expect(screen.queryByRole('button', { name: /web two/i })).not.toBeInTheDocument();
			if (role === 'Author') {
				expect(screen.getByRole('button', { name: /web one/i })).toBeInTheDocument();
			} else {
				expect(screen.queryByRole('button', { name: /web one/i })).not.toBeInTheDocument();
				expect(screen.queryByText('review')).not.toBeInTheDocument();
			}
		}
	);

	it('does not render hidden challenge toggle for unprivileged roles', async () => {
		authState.user = { role: 'Player' } as any;
		render(SidebarChallengeView, { grouped: groupedMock });

		expect(screen.queryByTestId('sidebar-toggle-hidden-challenges')).not.toBeInTheDocument();
	});

	it('renders hidden challenge toggle for privileged roles and toggles visibility', async () => {
		authState.user = { role: 'Admin' } as any;
		const groupedWithHidden = [
			[
				'Web',
				[
					{ id: 1, name: 'Web Visible', points: 100, tags: [], hidden: false },
					{ id: 2, name: 'Web Hidden', points: 200, tags: [], hidden: true }
				]
			]
		];

		render(SidebarChallengeView, { grouped: groupedWithHidden as any });

		const toggle = await screen.findByTestId('sidebar-toggle-hidden-challenges');
		expect(toggle).toBeInTheDocument();
		expect(toggle).toHaveAttribute('aria-label', 'Hide hidden challenges');
		expect(screen.getByRole('button', { name: /web hidden/i })).toBeInTheDocument();

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-label', 'Show hidden challenges');
		expect(screen.queryByRole('button', { name: /web hidden/i })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /web visible/i })).toBeInTheDocument();
	});

	it('renders tag filter button before view toggle button', async () => {
		render(SidebarChallengeView, { grouped: groupedMock });

		const tagFilter = screen.getByTestId('filter-by-tags');
		const viewToggle = screen.getByTestId('toggle-view-grid');
		expect(tagFilter.compareDocumentPosition(viewToggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
