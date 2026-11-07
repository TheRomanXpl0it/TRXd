import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

const { authState, loadUser } = vi.hoisted(() => ({
	authState: { user: null as any, userMode: false },
	loadUser: vi.fn()
}));

vi.mock('$lib/stores/auth', () => ({
	authState,
	loadUser
}));

import { load } from '../../../src/routes/+layout';

describe('Root Layout Auth Guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authState.user = null;
		vi.mocked(loadUser).mockResolvedValue(undefined);
	});

	it('allows logged out users to access forgot password', async () => {
		await expect(load({ url: new URL('http://localhost/forgot') } as any)).resolves.toEqual({});
		expect(loadUser).toHaveBeenCalledWith(false);
	});

	it('redirects logged out users away from protected routes', async () => {
		await expect(load({ url: new URL('http://localhost/challenges') } as any)).rejects.toSatisfy(
			(err) => isRedirect(err) && err.location === '/signIn'
		);
	});

	it('allows /admin to pass through so admin layout can render 404 directly without throwing', async () => {
		authState.user = null;
		await expect(load({ url: new URL('http://localhost/admin') } as any)).resolves.toEqual({});
	});

	it('allows guest routes for unauthenticated visitors', async () => {
		authState.user = null;
		await expect(load({ url: new URL('http://localhost/signIn') } as any)).resolves.toEqual({});
	});

	it('redirects logged-in users away from guest-only routes', async () => {
		authState.user = { role: 'User' };
		await expect(load({ url: new URL('http://localhost/signIn') } as any)).rejects.toSatisfy(
			(err) => isRedirect(err) && err.location === '/challenges'
		);
	});
});
