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

		expect(
			formatConnectionString({
				host: 'challenge.example',
				port: 80,
				connType: 'TCP'
			})
		).toBe('nc challenge.example 80');
	});

	it('omits redundant default ports for http (80) and https (443)', () => {
		expect(
			formatConnectionString({
				host: 'web.example.com',
				port: 80,
				connType: 'HTTP'
			})
		).toBe('http://web.example.com');

		expect(
			formatConnectionString({
				host: 'web.example.com',
				port: '80',
				connType: 'HTTP'
			})
		).toBe('http://web.example.com');

		expect(
			formatConnectionString({
				host: 'secure.example.com',
				port: 443,
				connType: 'HTTPS'
			})
		).toBe('https://secure.example.com');

		expect(
			formatConnectionString({
				host: 'secure.example.com',
				port: '443',
				connType: 'HTTPS'
			})
		).toBe('https://secure.example.com');
	});

	it('preserves non-default ports for http and https', () => {
		expect(
			formatConnectionString({
				host: 'web.example.com',
				port: 8080,
				connType: 'HTTP'
			})
		).toBe('http://web.example.com:8080');

		expect(
			formatConnectionString({
				host: 'secure.example.com',
				port: 8443,
				connType: 'HTTPS'
			})
		).toBe('https://secure.example.com:8443');
	});
});
