import { describe, expect, it } from 'vitest';
import { updateChallengeCache } from '$lib/utils/challenge-cache';

describe('updateChallengeCache', () => {
	it('updates a challenge inside a raw challenge array', () => {
		const cache = [
			{ id: 1, name: 'one', timeout: 0, instance_host: null },
			{ id: 2, name: 'two', timeout: 0, instance_host: null }
		] as any;

		expect(updateChallengeCache(cache, 2, { timeout: 120, instance_host: 'box.test' })).toEqual([
			{ id: 1, name: 'one', timeout: 0, instance_host: null },
			{ id: 2, name: 'two', timeout: 120, instance_host: 'box.test' }
		]);
	});

	it('updates a challenge inside a paginated cache shape', () => {
		const cache = {
			success: true,
			data: [
				{ id: 1, name: 'one', timeout: 0, instance_port: null },
				{ id: 2, name: 'two', timeout: 0, instance_port: null }
			]
		} as any;

		expect(updateChallengeCache(cache, 1, { timeout: 45, instance_port: 31337 })).toEqual({
			success: true,
			data: [
				{ id: 1, name: 'one', timeout: 45, instance_port: 31337 },
				{ id: 2, name: 'two', timeout: 0, instance_port: null }
			]
		});
	});
});
