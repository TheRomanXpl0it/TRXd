import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api, authState } = vi.hoisted(() => ({
	api: vi.fn(),
	authState: {
		userMode: false
	}
}));

vi.mock('$lib/api', () => ({
	api
}));

vi.mock('$lib/stores/auth', () => ({
	authState
}));

vi.mock('$lib/team', () => ({
	getTeamByEmail: vi.fn(),
	getTeamByName: vi.fn()
}));

import { updateUser } from '../../../src/lib/user';

describe('frontend user requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api).mockResolvedValue(undefined);
		authState.userMode = false;
	});

	it('forwards user names unchanged on profile updates', async () => {
		await updateUser(5, '\u00a0Cafe\u0301\u00a0', 'ITA');

		expect(api).toHaveBeenCalledWith('/users', {
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			body: JSON.stringify({
				id: 5,
				name: '\u00a0Cafe\u0301\u00a0',
				country: 'ITA'
			})
		});
	});

	it('forwards empty-looking user names unchanged on update', async () => {
		await updateUser(5, '   ', 'ITA');

		expect(api).toHaveBeenCalledWith('/users', {
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			body: JSON.stringify({
				id: 5,
				name: '   ',
				country: 'ITA'
			})
		});
	});
});
