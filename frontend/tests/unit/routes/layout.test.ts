import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

const { authState, loadUser } = vi.hoisted(() => ({
	authState: { user: null as any },
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
});
