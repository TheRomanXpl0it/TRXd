import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({
	api: vi.fn()
}));

vi.mock('$lib/api', () => ({
	api
}));

import { createTeam, joinTeam, updateTeam } from '../../../src/lib/team';

describe('frontend team requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api).mockResolvedValue(undefined);
	});

	it('forwards team names unchanged on team creation', async () => {
		await createTeam('\u00a0Cafe\u0301 Crew\u00a0', 'password123');

		expect(api).toHaveBeenCalledWith('/teams/register', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				name: '\u00a0Cafe\u0301 Crew\u00a0',
				password: 'password123'
			})
		});
	});

	it('forwards team names unchanged on join requests', async () => {
		await joinTeam('\u00a0Noe\u0308l Squad\u00a0', 'password123');

		expect(api).toHaveBeenCalledWith('/teams/join', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				name: '\u00a0Noe\u0308l Squad\u00a0',
				password: 'password123'
			})
		});
	});

	it('forwards team names unchanged on team updates', async () => {
		await updateTeam(7, '\u00a0Duo\u0301 Team\u00a0', 'ITA', ['tag1']);

		expect(api).toHaveBeenCalledWith('/teams', {
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			body: JSON.stringify({
				id: 7,
				name: '\u00a0Duo\u0301 Team\u00a0',
				country: 'ITA',
				tags: ['tag1']
			})
		});
	});

	it('forwards empty-looking team names unchanged on update', async () => {
		await updateTeam(7, '   ', 'ITA', []);

		expect(api).toHaveBeenCalledWith('/teams', {
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			body: JSON.stringify({
				id: 7,
				name: '   ',
				country: 'ITA',
				tags: []
			})
		});
	});
});
