import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import { getTeamByEmail, getTeamByName } from '$lib/team';
import { getUserByEmail, getUserByName } from '$lib/user';

const apiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/api', () => ({
	api: apiMock
}));

describe('search response parsing', () => {
	beforeEach(() => {
		apiMock.mockReset();
		authState.userMode = false;
	});

	it('accepts a direct user object from /users/search', async () => {
		apiMock.mockResolvedValue({
			id: 1,
			name: 'admin',
			email: 'admin@example.com',
			role: 'Admin'
		});

		await expect(getUserByEmail('admin@example.com')).resolves.toEqual([
			expect.objectContaining({
				id: 1,
				email: 'admin@example.com'
			})
		]);
	});

	it('accepts the array returned by /users/search and preserves every user', async () => {
		apiMock.mockResolvedValue([
			{ id: 2, name: 'alice', email: 'alice@example.com', role: 'Player' },
			{ id: 3, name: 'alicia', email: 'alicia@example.com', role: 'Author' }
		]);

		await expect(getUserByName('ali')).resolves.toEqual([
			expect.objectContaining({ id: 2, name: 'alice' }),
			expect.objectContaining({ id: 3, name: 'alicia' })
		]);
	});

	it('still accepts a wrapped user array response', async () => {
		apiMock.mockResolvedValue({
			users: [{ id: 2, name: 'alice', email: 'alice@example.com', role: 'User' }]
		});

		await expect(getUserByName('alice')).resolves.toEqual([
			expect.objectContaining({
				id: 2,
				name: 'alice'
			})
		]);
	});

	it('keeps an empty user search result empty', async () => {
		apiMock.mockResolvedValue([]);

		await expect(getUserByName('missing-user')).resolves.toEqual([]);
	});

	it('accepts a direct team object from /teams/search', async () => {
		apiMock.mockResolvedValue({
			id: 3,
			name: 'team-admin',
			email: 'team@example.com',
			role: 'Admin'
		});

		await expect(getTeamByEmail('team@example.com')).resolves.toEqual([
			expect.objectContaining({
				id: 3,
				email: 'team@example.com'
			})
		]);
	});

	it('accepts the array returned by /teams/search and preserves every team', async () => {
		apiMock.mockResolvedValue([
			{ id: 4, name: 'team-rocket', role: 'User' },
			{ id: 5, name: 'team-raccoon', role: 'User' }
		]);

		await expect(getTeamByName('team')).resolves.toEqual([
			expect.objectContaining({ id: 4, name: 'team-rocket' }),
			expect.objectContaining({ id: 5, name: 'team-raccoon' })
		]);
	});

	it('still accepts a wrapped team array response', async () => {
		apiMock.mockResolvedValue({
			teams: [{ id: 4, name: 'team-rocket', role: 'User' }]
		});

		await expect(getTeamByName('team-rocket')).resolves.toEqual([
			expect.objectContaining({
				id: 4,
				name: 'team-rocket'
			})
		]);
	});

	it('keeps an empty team search result empty in team control mode', async () => {
		authState.userMode = true;
		apiMock.mockResolvedValue([]);

		await expect(getUserByName('missing-team')).resolves.toEqual([]);
	});
});
