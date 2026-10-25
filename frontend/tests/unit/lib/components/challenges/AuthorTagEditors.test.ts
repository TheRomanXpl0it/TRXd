import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../render';
import CreateChallengeModal from '$lib/components/challenges/CreateChallengeModal.svelte';
import ChallengeEditSheet from '$lib/components/challenges/ChallengeEditSheet.svelte';
import { createChallenge, getChallenge, getChallenges, updateChallenge } from '$lib/challenges';
import { toast } from 'svelte-sonner';

vi.mock('$lib/challenges', () => ({
	createChallenge: vi.fn(),
	getChallenge: vi.fn(),
	getChallenges: vi.fn(),
	updateChallenge: vi.fn(),
	uploadAttachments: vi.fn(),
	deleteAttachments: vi.fn()
}));
vi.mock('$lib/flags', () => ({ createFlags: vi.fn(), deleteFlags: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('Author tag modal and sheet editors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createChallenge).mockResolvedValue({});
		vi.mocked(updateChallenge).mockResolvedValue(undefined);
		vi.mocked(getChallenges).mockResolvedValue([{ id: 42, name: 'Web Challenge' }] as any);
	});

	it('saves author tags when creating through the modal', async () => {
		const user = userEvent.setup();
		renderWithProviders(CreateChallengeModal, {
			open: true,
			challengeName: 'Web Challenge',
			category: 'Web',
			categories: [{ label: 'Web', value: 'Web' }],
			challengeInstanceTypes: [{ label: 'Static', value: 'Static' }]
		});

		await user.click(await screen.findByLabelText('Author-only tags'));
		await user.type(screen.getByPlaceholderText('Search or create...'), 'review{Enter}');
		await user.keyboard('{Escape}');
		await user.click(screen.getByRole('button', { name: /^flags$/i }));
		const flagInput = screen.getByPlaceholderText('TRX{...}');
		await fireEvent.input(flagInput, { target: { value: `TRX{${crypto.randomUUID()}}` } });
		await user.click(screen.getByRole('button', { name: /^create challenge$/i }));

		await waitFor(() =>
			expect(updateChallenge).toHaveBeenCalledWith(
				expect.objectContaining({ chall_id: 42, author_tags: ['review'], tags: [] })
			)
		);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'uses fresh author tags from the detail endpoint in the edit sheet (clear: %s)',
		async (clearTags) => {
			const user = userEvent.setup();
			vi.mocked(getChallenge).mockResolvedValue({
				id: 42,
				name: 'Web Challenge',
				category: 'Web',
				tags: ['web'],
				author_tags: ['review'],
				flags: []
			} as any);
			renderWithProviders(ChallengeEditSheet, {
				open: true,
				challenge_user: { id: 42, name: 'Web Challenge', category: 'Web', author_tags: ['stale'] }
			});

			await waitFor(() => expect(getChallenge).toHaveBeenCalledWith(42));
			await user.click(await screen.findByRole('button', { name: /^settings$/i }));
			expect(await screen.findByText('review')).toBeInTheDocument();
			expect(screen.queryByText('stale')).not.toBeInTheDocument();
			if (clearTags) await user.click(screen.getByRole('button', { name: 'Remove review' }));
			await user.click(screen.getByRole('button', { name: /save/i }));

			await waitFor(() =>
				expect(updateChallenge).toHaveBeenCalledWith(
					expect.objectContaining({
						chall_id: 42,
						tags: ['web'],
						author_tags: clearTags ? [] : ['review']
					})
				)
			);
		}
	);
});
