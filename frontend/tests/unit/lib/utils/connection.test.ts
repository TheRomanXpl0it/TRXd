import { describe, expect, it } from 'vitest';

import { formatConnectionString } from '$lib/utils/connection';

describe('formatConnectionString', () => {
	it('uses ssl on 443 when a tcp instance has no usable port', () => {
		expect(
			formatConnectionString({
				host: '7751f4b288a2.localhost',
				port: 0,
				connType: 'TCP',
				sslWithoutPort: true
			})
		).toBe('ncat --ssl 7751f4b288a2.localhost 443');

		expect(
			formatConnectionString({
				host: '7751f4b288a2.localhost',
				port: '0',
				connType: 'TCP',
				sslWithoutPort: true
			})
		).toBe('ncat --ssl 7751f4b288a2.localhost 443');
	});

	it('keeps plain tcp formatting when a real port exists', () => {
		expect(
			formatConnectionString({
				host: 'challenge.example',
				port: 31337,
				connType: 'TCP',
				sslWithoutPort: true
			})
		).toBe('nc challenge.example 31337');
	});
});
