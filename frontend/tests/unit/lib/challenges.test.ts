import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => vi.fn());

vi.mock('$lib/api', () => ({ api }));

import { deleteChallenge } from '$lib/challenges';

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
});
