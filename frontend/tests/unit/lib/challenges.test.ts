import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => vi.fn());

vi.mock('$lib/api', () => ({ api }));

import {
	deleteChallenge,
	getChallenge,
	getChallenges,
	getSolves,
	updateChallenge
} from '$lib/challenges';

describe('frontend challenge requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		api.mockResolvedValue(undefined);
	});

	it('sends a numeric challenge ID when deleting a challenge', async () => {
		await deleteChallenge(42);

		expect(api).toHaveBeenCalledWith('/challenges', {
			headers: { 'content-type': 'application/json' },
			method: 'DELETE',
			body: JSON.stringify({ chall_id: 42 })
		});
		expect(JSON.parse(api.mock.calls[0][1].body).chall_id).toBeTypeOf('number');
	});

	it('preserves author tags and the requested ID from the admin detail endpoint', async () => {
		api.mockResolvedValue({ name: 'Web Challenge', tags: ['web'], author_tags: ['review'] });

		expect(await getChallenge('42')).toEqual({
			id: 42,
			name: 'Web Challenge',
			tags: ['web'],
			author_tags: ['review']
		});
		expect(api).toHaveBeenCalledWith('/challenges/42');
	});

	it('keeps author tags optional in the challenge list for players', async () => {
		api.mockResolvedValue([{ id: 42, tags: ['web'] }]);

		expect(await getChallenges()).toEqual([{ id: 42, tags: ['web'] }]);
		expect(api).toHaveBeenCalledWith('/challenges');
	});

	it('loads solves through the player-accessible solves endpoint', async () => {
		const solves = [{ id: 7, name: 'Team', timestamp: '2026-10-25T10:00:00Z' }];
		api.mockResolvedValue(solves);

		expect(await getSolves(42)).toEqual(solves);
		expect(api).toHaveBeenCalledWith('/challenges/42/solves');
	});

	it.each([undefined, [], ['review']])(
		'sends optional author tags without changing public tags: %j',
		async (authorTags) => {
			await updateChallenge({ chall_id: 42, tags: ['web'], author_tags: authorTags });

			const body = JSON.parse(api.mock.calls[0][1].body);
			expect(api.mock.calls[0][0]).toBe('/challenges');
			expect(api.mock.calls[0][1].method).toBe('PATCH');
			expect(body.tags).toEqual(['web']);
			if (authorTags === undefined) expect(body).not.toHaveProperty('author_tags');
			else expect(body.author_tags).toEqual(authorTags);
		}
	);
});
