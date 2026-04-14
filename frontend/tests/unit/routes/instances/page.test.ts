import { screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '../../render';
import Page from '../../../../src/routes/instances/+page.svelte';
import { getInstances } from '$lib/instances';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/stores/auth', () => ({
	authState: {
		user: { role: 'Admin' }
	}
}));

vi.mock('$lib/instances', () => ({
	getInstances: vi.fn(),
	adminStopInstance: vi.fn()
}));

describe('Instances Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getInstances).mockResolvedValue([
			{
				team_id: 7,
				team_name: 'Blue Team',
				chall_id: 11,
				chall_name: 'Hash Domain',
				docker_id: 'docker-abc123',
				host: '7751f4b288a2.localhost',
				port: 0,
				conn_type: 'TCP',
				expires_at: null
			}
		] as any);
	});

	it('shows docker id and ssl connection details for hash-domain instances', async () => {
		renderWithProviders(Page);

		await waitFor(() => {
			expect(getInstances).toHaveBeenCalledTimes(1);
		});

		expect(await screen.findByText('docker-abc123')).toBeInTheDocument();
		expect(await screen.findByText('ncat --ssl 7751f4b288a2.localhost 443')).toBeInTheDocument();
	});
});
