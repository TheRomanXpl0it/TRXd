import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../render';
import Page from '../../../../../../src/routes/admin/challenges/[id]/edit/+page.svelte';
import { getCategories } from '$lib/categories';

vi.mock('svelte-sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('$lib/challenges', () => ({
	updateChallenge: vi.fn(),
	uploadAttachments: vi.fn(),
	deleteAttachments: vi.fn()
}));

vi.mock('$lib/flags', () => ({
	createFlags: vi.fn(),
	deleteFlags: vi.fn()
}));

vi.mock('$lib/categories', () => ({
	getCategories: vi.fn()
}));

describe('Admin Challenge Edit Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCategories).mockResolvedValue(['Web']);
	});

	it('loads deployment fields from the flat challenge response', async () => {
		const user = userEvent.setup();
		const challenge = {
			id: 42,
			name: 'Flat Config',
			category: 'Web',
			description: '',
			instance_type: 'Container',
			score_type: 'Static',
			points: 500,
			max_points: 500,
			tags: [],
			authors: [],
			instance: false,
			conn_type: 'TCP',
			image: 'registry.example/challenge:latest',
			lifetime: 2400,
			renewable: true,
			hash_domain: true,
			envs: JSON.stringify({ FLAG_PATH: '/flag' }),
			max_memory: 768,
			max_cpu: '1.5'
		};

		renderWithProviders(Page, { props: { data: { challenge } } });
		await waitFor(() => expect(getCategories).toHaveBeenCalled());
		await user.click(screen.getByRole('button', { name: /deployment/i }));

		expect(screen.getByLabelText(/Docker Image Name/i)).toHaveValue(
			'registry.example/challenge:latest'
		);
		expect(screen.getByLabelText(/Max CPU/i)).toHaveValue('1.5');
		expect(screen.getByLabelText(/Max RAM/i)).toHaveValue(768);
		expect(screen.getByLabelText(/Lifetime/i)).toHaveValue(2400);
		expect(screen.getByRole('checkbox', { name: 'Hash Domain' })).toBeChecked();
		expect(screen.getByRole('checkbox', { name: 'Renewable' })).toBeChecked();
		expect(screen.getByPlaceholderText('KEY')).toHaveValue('FLAG_PATH');
		expect(screen.getByPlaceholderText('VALUE')).toHaveValue('/flag');
		expect(screen.getByText('TCP')).toBeInTheDocument();
	});
});
