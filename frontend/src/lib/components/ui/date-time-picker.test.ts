import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateTimePickerHarness from '../../../test/fixtures/date-time-picker-harness.svelte';

function getCalendarDay(label: string): HTMLButtonElement {
	const day = screen
		.getAllByRole('button')
		.find(
			(button) =>
				button.getAttribute('aria-pressed') !== null && button.textContent?.trim() === label
		);

	if (!day) {
		throw new Error(`Calendar day ${label} not found`);
	}

	return day as HTMLButtonElement;
}

function formatLocalDateTime(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

describe('DateTimePicker', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('updates the bound value when a new day and time are selected', async () => {
		render(DateTimePickerHarness, { initialValue: '2026-04-14T09:30' });

		await fireEvent.click(screen.getByRole('button', { name: /2026/i }));
		await fireEvent.change(screen.getByLabelText('Hour'), { target: { value: '13' } });
		await fireEvent.change(screen.getByLabelText('Minute'), { target: { value: '45' } });
		await fireEvent.click(getCalendarDay('21'));

		expect(screen.getByTestId('value')).toHaveTextContent('2026-04-21T13:45');
	});

	it('supports quick now and clear actions', async () => {
		const fixedNow = new Date(2026, 3, 14, 8, 7, 0);
		vi.useFakeTimers();
		vi.setSystemTime(fixedNow);

		render(DateTimePickerHarness);

		await fireEvent.click(screen.getByRole('button', { name: /Select date and time/i }));
		await fireEvent.click(screen.getByRole('button', { name: 'Now' }));

		expect(screen.getByTestId('value')).toHaveTextContent(formatLocalDateTime(fixedNow));

		await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

		expect(screen.getByTestId('value')).toHaveTextContent('');
	});
});
