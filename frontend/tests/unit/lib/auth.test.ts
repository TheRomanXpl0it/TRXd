import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({
	api: vi.fn()
}));

vi.mock('$lib/api', () => ({
	api
}));

import { completeVerifiedRegistration, register } from '../../../src/lib/auth';

describe('frontend registration normalization', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api).mockResolvedValue(undefined);
	});

	it('normalizes signup names before calling register', async () => {
		await register('tester@example.com', 'password123', '\u00a0Cafe\u0301\u00a0');

		expect(api).toHaveBeenCalledWith('/register', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				email: 'tester@example.com',
				password: 'password123',
				name: 'Café'
			})
		});
	});

	it('normalizes verification signup names before completing registration', async () => {
		await completeVerifiedRegistration('test-token', '\u00a0Noe\u0308l\u00a0', 'password123');

		expect(api).toHaveBeenCalledWith('/register', {
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			body: JSON.stringify({
				token: 'test-token',
				name: 'Noël',
				password: 'password123'
			})
		});
	});

	it.each([
		'   ',
		'bad\nname',
		'bad\tname',
		'bad\u200bname',
		'bad\u202ename',
		'bad\u00a0name'
	])('rejects invalid signup name %j before calling the API', async (name) => {
		await expect(register('tester@example.com', 'password123', name)).rejects.toThrow(
			'Invalid user name'
		);

		expect(api).not.toHaveBeenCalled();
	});
});
