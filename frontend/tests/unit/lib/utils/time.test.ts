import { describe, it, expect } from 'vitest';
import { fmtTimeLeft, formatTimeAgo } from '$lib/utils/time';

describe('fmtTimeLeft', () => {
	it('formats times greater than or equal to an hour as h:mm:ss', () => {
		expect(fmtTimeLeft(3600)).toBe('1:00:00');
		expect(fmtTimeLeft(3661)).toBe('1:01:01');
		expect(fmtTimeLeft(7265)).toBe('2:01:05');
	});

	it('formats times under an hour as m:ss', () => {
		expect(fmtTimeLeft(60)).toBe('1:00');
		expect(fmtTimeLeft(125)).toBe('2:05');
		expect(fmtTimeLeft(599)).toBe('9:59');
	});

	it('formats times under a minute as plain seconds', () => {
		expect(fmtTimeLeft(45)).toBe('45');
		expect(fmtTimeLeft(5)).toBe('5');
		expect(fmtTimeLeft(0)).toBe('0');
	});

	it('handles negative or null values safely', () => {
		expect(fmtTimeLeft(-10)).toBe('0');
		expect(fmtTimeLeft(null as any)).toBe('0');
	});
});

describe('formatTimeAgo', () => {
	const fixedNow = 1700000000000;

	it('formats seconds ago', () => {
		expect(formatTimeAgo(fixedNow - 15000, fixedNow)).toBe('15s ago');
		expect(formatTimeAgo(fixedNow - 500, fixedNow)).toBe('just now');
		expect(formatTimeAgo(fixedNow + 1000, fixedNow)).toBe('just now');
	});

	it('formats minutes ago', () => {
		expect(formatTimeAgo(fixedNow - 65000, fixedNow)).toBe('1m ago');
		expect(formatTimeAgo(fixedNow - 150000, fixedNow)).toBe('2m ago');
		expect(formatTimeAgo(fixedNow - 3540000, fixedNow)).toBe('59m ago');
	});

	it('formats hours and minutes ago', () => {
		expect(formatTimeAgo(fixedNow - 3600000, fixedNow)).toBe('1h ago');
		expect(formatTimeAgo(fixedNow - 3900000, fixedNow)).toBe('1h 5m ago');
		expect(formatTimeAgo(fixedNow - 7320000, fixedNow)).toBe('2h 2m ago');
	});

	it('formats days and hours ago', () => {
		expect(formatTimeAgo(fixedNow - 86400000, fixedNow)).toBe('1d ago');
		expect(formatTimeAgo(fixedNow - 97200000, fixedNow)).toBe('1d 3h ago');
	});

	it('handles invalid dates gracefully', () => {
		expect(formatTimeAgo('invalid')).toBe('');
	});
});
