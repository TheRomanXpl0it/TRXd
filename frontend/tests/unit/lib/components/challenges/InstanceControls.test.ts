import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InstanceControls from '$lib/components/challenges/InstanceControls.svelte';
import { startInstance, stopInstance } from '$lib/instances';
import { toast } from 'svelte-sonner';

// Mock the instances API
vi.mock('$lib/instances', () => ({
	startInstance: vi.fn(),
	stopInstance: vi.fn(),
	renewInstance: vi.fn()
}));

// Mock svelte-sonner toast
vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('InstanceControls Component', () => {
	const originalError = console.error;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset clipboard mock
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: vi.fn()
			},
			writable: true,
			configurable: true
		});
		Object.defineProperty(window, 'isSecureContext', {
			value: true,
			writable: true,
			configurable: true
		});
		// Suppress console.error for cleaner test output
		console.error = vi.fn();
	});

	afterEach(() => {
		// Restore console.error
		console.error = originalError;
	});

	it('starts instance when clicking Start Instance button', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStart = vi.mocked(startInstance);
		const mockToast = vi.mocked(toast);
		const onCountdownUpdate = vi.fn();
		const onInstanceChange = vi.fn();

		mockStart.mockResolvedValueOnce({
			host: 'abc123.ctf.example.com',
			timeout: 3600,
			hash_domain: true
		});

		const challenge = { id: challengeId, instance_host: null, instance_port: null, timeout: null };
		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 0,
				onCountdownUpdate,
				onInstanceChange
			}
		});

		const startButton = screen.getByRole('button', { name: /start.*instance/i });
		await user.click(startButton);

		// Verify API was called
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalledWith(challengeId);
		});

		// Verify success toast
		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Instance created!');
		});

		// Verify countdown callback was called
		expect(onCountdownUpdate).toHaveBeenCalledWith(challengeId, 3600);
		expect(onInstanceChange).toHaveBeenCalledWith(
			expect.objectContaining({
				instance_host: 'abc123.ctf.example.com',
				instance_port: null,
				instance_hash_domain: true
			})
		);
	});

	it('stops instance when clicking stop button', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStop = vi.mocked(stopInstance);
		const mockToast = vi.mocked(toast);
		const onCountdownUpdate = vi.fn();

		mockStop.mockResolvedValueOnce(undefined);

		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 1800, // 30 minutes left
				onCountdownUpdate
			}
		});

		// Should show running state with stop button
		const stopButton = screen.getByRole('button', { name: /stop instance/i });
		await user.click(stopButton);

		// Verify API was called
		await waitFor(() => {
			expect(mockStop).toHaveBeenCalledWith(challengeId);
		});

		// Verify success toast
		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Instance stopped!');
		});

		// Verify countdown callback was called with 0
		expect(onCountdownUpdate).toHaveBeenCalledWith(challengeId, 0);
	});

	it('copies connection string to clipboard when clicking running instance', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockToast = vi.mocked(toast);

		// Create a fresh mock for this test
		const mockWriteText = vi.fn().mockResolvedValueOnce(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: mockWriteText },
			writable: true,
			configurable: true
		});

		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		// Click the running instance button (green background with connection string)
		const instanceButton = screen.getByRole('button', {
			name: /copy instance connection address/i
		});
		await user.click(instanceButton);

		// Verify clipboard API was called with connection string
		expect(mockWriteText).toHaveBeenCalledWith('ctf.example.com:1337');

		// Verify success toast
		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Copied to clipboard!');
		});
	});

	it('shows error toast when instance creation fails', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStart = vi.mocked(startInstance);
		const mockToast = vi.mocked(toast);

		mockStart.mockRejectedValueOnce(new Error('No available instances'));

		const challenge = { id: challengeId, instance_host: null, instance_port: null, timeout: null };
		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 0
			}
		});

		const startButton = screen.getByRole('button', { name: /start.*instance/i });
		await user.click(startButton);

		// Verify error toast
		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith(
				expect.stringMatching(/Error:.*No available instances/)
			);
		});

		// API should have been called
		expect(mockStart).toHaveBeenCalledWith(challengeId);
	});

	it('shows error toast when instance stop fails', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStop = vi.mocked(stopInstance);
		const mockToast = vi.mocked(toast);

		mockStop.mockRejectedValueOnce(new Error('Instance not found'));

		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 1800
			}
		});

		const stopButton = screen.getByRole('button', { name: /stop instance/i });
		await user.click(stopButton);

		// Verify error toast
		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith(
				expect.stringMatching(/Error:.*Instance not found/)
			);
		});
	});

	it('disables start button during instance creation', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStart = vi.mocked(startInstance);

		// Make the API call slow
		mockStart.mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve({ host: 'test', port: 1337, timeout: 3600 }), 100)
				)
		);

		const challenge = { id: challengeId, instance_host: null, instance_port: null, timeout: null };
		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 0
			}
		});

		const startButton = screen.getByRole('button', { name: /start.*instance/i });

		// Click button
		await user.click(startButton);

		// Button should show "Starting..." and be disabled
		await waitFor(() => {
			expect(screen.getByText(/starting/i)).toBeInTheDocument();
			expect(startButton).toBeDisabled();
		});
	});

	it('disables stop button during instance destruction', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStop = vi.mocked(stopInstance);

		// Make the API call slow
		mockStop.mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
		);

		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 1800
			}
		});

		const stopButton = screen.getByRole('button', { name: /stop instance/i });

		// Click button
		await user.click(stopButton);

		// Button should be disabled
		await waitFor(() => {
			expect(stopButton).toBeDisabled();
		});
	});

	it('prevents multiple simultaneous instance creation requests', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockStart = vi.mocked(startInstance);

		mockStart.mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve({ host: 'test', port: 1337, timeout: 3600 }), 100)
				)
		);

		const challenge = { id: challengeId, instance_host: null, instance_port: null, timeout: null };
		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 0
			}
		});

		const startButton = screen.getByRole('button', { name: /start.*instance/i });

		// Try to click multiple times rapidly
		await Promise.all([user.click(startButton), user.click(startButton), user.click(startButton)]);

		// Wait for request to complete
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalledTimes(1);
		});
	});

	it('formats countdown timer correctly for hours', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'test.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 7265 // 2:01:05
			}
		});

		// Should show formatted time with hours
		expect(screen.getByText(/2:01:05/)).toBeInTheDocument();
	});

	it('formats countdown timer correctly for minutes', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'test.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 125 // 2:05
			}
		});

		// Should show formatted time without hours
		expect(screen.getByText(/2:05/)).toBeInTheDocument();
	});

	it('formats countdown timer correctly for seconds only', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'test.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 45
			}
		});

		// Should show seconds (formatted as 0:45 in component)
		expect(screen.getByText('0:45')).toBeInTheDocument();
	});

	it('displays connection string with port', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		// Should show host:port
		expect(screen.getByText('ctf.example.com:1337')).toBeInTheDocument();
	});

	it('displays connection string without port when port is null', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: null,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		// Should show just host (no port)
		expect(screen.getByText('ctf.example.com')).toBeInTheDocument();
	});

	it('displays ssl command for hash-domain tcp instances without a port', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			conn_type: 'TCP',
			instance_host: 'abc123.ctf.example.com',
			instance_port: null,
			instance_hash_domain: true,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		expect(screen.getByText('ncat --ssl abc123.ctf.example.com 443')).toBeInTheDocument();
	});

	it('uses the flat challenge hash-domain field when instance_hash_domain is absent', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			conn_type: 'TCP',
			instance_host: 'abc123.ctf.example.com',
			instance_port: null,
			hash_domain: true,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		expect(screen.getByText('ncat --ssl abc123.ctf.example.com 443')).toBeInTheDocument();
	});

	it('uses the flat renewable field for an already running instance', () => {
		renderWithProviders(InstanceControls, {
			props: {
				challenge: {
					id: 42,
					instance_host: 'ctf.example.com',
					instance_port: 1337,
					renewable: false
				},
				countdown: 3600
			}
		});

		expect(screen.queryByTitle('Renew Instance')).not.toBeInTheDocument();
		expect(screen.getByText('1:00:00')).toBeInTheDocument();
	});

	it('handles clipboard copy failure gracefully', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const user = userEvent.setup();
		const mockToast = vi.mocked(toast);

		// Mock clipboard to reject
		navigator.clipboard.writeText = vi
			.fn()
			.mockRejectedValueOnce(new Error('Clipboard access denied'));

		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600
			}
		});

		const instanceButton = screen.getByRole('button', { name: /copy instance connection/i });
		await user.click(instanceButton);

		// Verify error toast
		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith('Failed to copy to clipboard.');
		});
	});

	it('shows start button when countdown is 0', () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = { id: challengeId, instance_host: null, instance_port: null, timeout: null };

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 0
			}
		});

		// Should show Start Instance button
		expect(screen.getByRole('button', { name: /start.*instance/i })).toBeInTheDocument();
		// Should NOT show running instance button
		expect(
			screen.queryByRole('button', { name: /copy instance connection address/i })
		).not.toBeInTheDocument();
	});

	it('shows running instance button when countdown is greater than 0', () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 1800
			}
		});

		// Should show running instance with countdown
		expect(
			screen.getByRole('button', { name: /copy instance connection address/i })
		).toBeInTheDocument();
		// Should NOT show Start Instance button
		expect(screen.queryByRole('button', { name: /start.*instance/i })).not.toBeInTheDocument();
	});

	it('updates displayed countdown when prop changes', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		const { rerender } = renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 3600 // 1:00:00
			}
		});

		// Initial countdown shows 1:00:00
		expect(screen.getByText(/1:00:00/)).toBeInTheDocument();

		// Update countdown to 30 seconds
		await rerender({ challenge, countdown: 30 });

		await waitFor(
			() => {
				expect(screen.getByText('0:30')).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
		expect(screen.queryByText(/1:00:00/)).not.toBeInTheDocument();
	});

	it('switches to start button when countdown reaches 0', async () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		const { rerender } = renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: 10 // About to expire
			}
		});

		// Should show running instance
		expect(
			screen.getByRole('button', { name: /copy instance connection address/i })
		).toBeInTheDocument();

		// Update countdown to 0 (expired)
		await rerender({
			challenge: { ...challenge, instance_host: null, instance_port: null, timeout: null },
			countdown: 0
		});

		// Should now show start button
		await waitFor(
			() => {
				expect(screen.getByRole('button', { name: /start.*instance/i })).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
		expect(
			screen.queryByRole('button', { name: /copy instance connection address/i })
		).not.toBeInTheDocument();
	});

	it('handles negative countdown values as 0', () => {
		const challengeId = Math.floor(Math.random() * 10000);
		const challenge = {
			id: challengeId,
			instance_host: 'ctf.example.com',
			instance_port: 1337,
			timeout: 3600
		};

		renderWithProviders(InstanceControls, {
			props: {
				challenge,
				countdown: -50 // Negative value
			}
		});

		// With countdown <= 0, should show start button instead of running state
		expect(screen.getByRole('button', { name: /start.*instance/i })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /copy instance connection address/i })
		).not.toBeInTheDocument();
	});
});
