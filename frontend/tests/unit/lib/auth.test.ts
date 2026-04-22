import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({
	api: vi.fn()
}));

vi.mock('$lib/api', () => ({
	api
}));

import { completeVerifiedRegistration, register } from '../../../src/lib/auth';

describe('frontend registration requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api).mockResolvedValue(undefined);
	});

	it('forwards signup names unchanged to the backend', async () => {
		await register('tester@example.com', 'password123', '\u00a0Cafe\u0301\u00a0');

		expect(api).toHaveBeenCalledWith('/register', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				email: 'tester@example.com',
				password: 'password123',
				name: '\u00a0Cafe\u0301\u00a0'
			})
		});
	});

	it('forwards verification signup names unchanged to the backend', async () => {
		await completeVerifiedRegistration('test-token', '\u00a0Noe\u0308l\u00a0', 'password123');

		expect(api).toHaveBeenCalledWith('/register', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				token: 'test-token',
				name: '\u00a0Noe\u0308l\u00a0',
				password: 'password123'
			})
		});
	});
});
