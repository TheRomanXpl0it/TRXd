import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '$lib/stores/auth';
import Page from '../routes/admin/configs/+page.svelte';

const getConfigsMock = vi.hoisted(() => vi.fn());
const updateConfigsMock = vi.hoisted(() => vi.fn());
const showSuccessMock = vi.hoisted(() => vi.fn());
const showErrorMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/config', () => ({
	getConfigs: getConfigsMock,
	updateConfigs: updateConfigsMock
}));

vi.mock('$lib/utils/toast', () => ({
	showSuccess: showSuccessMock,
	showError: showErrorMock
}));

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

describe('Admin configs page', () => {
	beforeEach(() => {
		authState.ready = true;
		authState.user = { role: 'Admin' } as any;

		getConfigsMock.mockReset();
		updateConfigsMock.mockReset();
		showSuccessMock.mockReset();
		showErrorMock.mockReset();
		updateConfigsMock.mockResolvedValue({});
	});

	afterEach(() => {
		authState.ready = false;
		authState.user = null;
		vi.useRealTimers();
	});

	it('renders configuration groups as tabs and keeps field types per config', async () => {
		getConfigsMock.mockResolvedValue([
			{
				key: 'start-time',
				type: 'date',
				value: '',
				category: 'event',
				name: 'Start Time',
				description: 'When the event starts'
			},
			{
				key: 'jwt-secret',
				type: 'string',
				value: 'secret-value',
				category: 'security',
				name: 'JWT Secret',
				secret: true
			}
		]);

		const { container } = render(Page);

		await screen.findByText('Start Time');

		expect(screen.getByRole('button', { name: /Event/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Security/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Select date and time/i })).toBeInTheDocument();
		expect(container.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /Security/i }));

		await screen.findByText('JWT Secret');
		expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Select date and time/i })).not.toBeInTheDocument();
	});

	it('saves edited date configs back as RFC3339 timestamps', async () => {
		const fixedNow = new Date(2026, 3, 14, 8, 7, 0);
		vi.useFakeTimers();
		vi.setSystemTime(fixedNow);

		getConfigsMock.mockResolvedValue([
			{
				key: 'start-time',
				type: 'date',
				value: '',
				category: 'event',
				name: 'Start Time'
			}
		]);

		render(Page);

		await screen.findByText('Start Time');
		await fireEvent.click(screen.getByRole('button', { name: /Select date and time/i }));
		await fireEvent.change(screen.getByLabelText('Hour'), { target: { value: '13' } });
		await fireEvent.change(screen.getByLabelText('Minute'), { target: { value: '45' } });
		await fireEvent.click(getCalendarDay('21'));

		const saveButton = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveButton).toBeEnabled());
		await fireEvent.click(saveButton);

		expect(updateConfigsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'start-time',
				value: new Date(2026, 3, 21, 13, 45).toISOString()
			})
		);
		expect(showSuccessMock).toHaveBeenCalled();
		expect(showErrorMock).not.toHaveBeenCalled();
	});
});
