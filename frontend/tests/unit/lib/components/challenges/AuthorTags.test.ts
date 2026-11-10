import { screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../render';
import AuthorTags from '$lib/components/challenges/AuthorTags.svelte';
import ChallengeCard from '$lib/components/challenges/ChallengeCard.svelte';
import ChallengeModal from '$lib/components/challenges/ChallengeModal.svelte';
import { authState } from '$lib/stores/auth';

vi.mock('$lib/stores/auth', () => ({ authState: { user: null } }));

describe('Author-only tags', () => {
	beforeEach(() => {
		authState.user = null;
	});

	it.each(['Author', 'Admin'])('displays private tags for %s', (role) => {
		authState.user = { role } as any;
		renderWithProviders(AuthorTags, { tags: ['review', 'unreleased'] });

		expect(screen.getByRole('list', { name: 'Author-only tags' })).toBeInTheDocument();
		expect(screen.getByText('review')).toBeInTheDocument();
		expect(screen.getAllByTitle('Author-only tag')).toHaveLength(2);
	});

	it.each(['Player', 'User', null])('hides private tags for %s', (role) => {
		authState.user = role ? ({ role } as any) : null;
		renderWithProviders(AuthorTags, { tags: ['review'] });

		expect(screen.queryByText('review')).not.toBeInTheDocument();
	});

	it('handles missing author tags in a player challenge response', () => {
		authState.user = { role: 'Admin' } as any;
		renderWithProviders(AuthorTags);

		expect(screen.queryByRole('list')).not.toBeInTheDocument();
	});

	it.each(['Author', 'Player'])(
		'keeps public and private tags separate in the card for %s',
		(role) => {
			authState.user = { role } as any;
			renderWithProviders(ChallengeCard, {
				challenge: { id: 42, name: 'Web Challenge', tags: ['web'], author_tags: ['review'] },
				onclick: vi.fn()
			});

			expect(screen.getByText('web')).toBeInTheDocument();
			if (role === 'Author') expect(screen.getByText('review')).toBeInTheDocument();
			else expect(screen.queryByText('review')).not.toBeInTheDocument();
		}
	);

	it('displays author tags in the challenge detail dialog', async () => {
		authState.user = { role: 'Author' } as any;
		const { unmount } = renderWithProviders(ChallengeModal, {
			open: true,
			challenge: { id: 42, name: 'Web Challenge', tags: ['web'], author_tags: ['review'] }
		});

		expect(await screen.findByText('review')).toBeInTheDocument();
		expect(screen.getByRole('list', { name: 'Challenge tags' })).toHaveTextContent('web');
		expect(screen.getByRole('list', { name: 'Challenge tags' })).not.toHaveTextContent('review');

		unmount();
		// Let bits-ui body-scroll-lock cleanup timer fire before environment teardown
		await new Promise((r) => setTimeout(r, 50));
	});
});
