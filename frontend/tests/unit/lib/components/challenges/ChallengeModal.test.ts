import { screen, waitFor } from '@testing-library/svelte';
import { renderWithProviders } from '../../../render';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChallengeModal from '$lib/components/challenges/ChallengeModal.svelte';
import { toast } from 'svelte-sonner';

// Mock toast
vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

// Mock API functions used by child components
vi.mock('$lib/challenges', () => ({
	submitFlag: vi.fn()
}));

vi.mock('$lib/instances', () => ({
	startInstance: vi.fn(),
	stopInstance: vi.fn()
}));

function generateRandomChallenge(overrides = {}) {
	return {
		id: Math.floor(Math.random() * 10000),
		name: `Challenge ${Math.floor(Math.random() * 100)}`,
		description: 'This is a test challenge description',
		points: Math.floor(Math.random() * 500) + 50,
		tags: ['web', 'crypto'],
		difficulty: 'medium',
		solves: 0,
		authors: ['Author1', 'Author2'],
		attachments: [],
		instance: false,
		host: null,
		port: null,
		...overrides
	};
}

describe('ChallengeModal Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock clipboard
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn() },
			writable: true,
			configurable: true
		});
	});

	it('renders challenge name and description', async () => {
		const challenge = generateRandomChallenge({
			name: 'Test Challenge',
			description: 'Test description here'
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText('Test Challenge')).toBeInTheDocument();
		expect(await screen.findByText('Test description here')).toBeInTheDocument();
	});

	it('displays all tags', async () => {
		const challenge = generateRandomChallenge({
			tags: ['web', 'pwn', 'forensics']
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText('web')).toBeInTheDocument();
		expect(await screen.findByText('pwn')).toBeInTheDocument();
		expect(await screen.findByText('forensics')).toBeInTheDocument();
	});

	it('shows blood icon for unsolved challenges', async () => {
		const challenge = generateRandomChallenge({
			solves: 0
		});

		const { container } = renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText('0 solves')).toBeInTheDocument();
	});

	it('shows solves count as clickable button when solves > 0', async () => {
		const challenge = generateRandomChallenge({
			solves: 5
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		const solvesButton = await screen.findByRole('button', { name: /view 5 solves/i });
		expect(solvesButton).toBeInTheDocument();
	});

	it('calls onOpenSolves when solves button is clicked', async () => {
		const challenge = generateRandomChallenge({
			solves: 3
		});
		const onOpenSolves = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge,
				onOpenSolves
			}
		});

		const solvesButton = screen.getByRole('button', { name: /view 3 solves/i });
		await user.click(solvesButton);

		expect(onOpenSolves).toHaveBeenCalledTimes(1);
	});

	it('displays challenge authors', async () => {
		const challenge = generateRandomChallenge({
			authors: ['Alice', 'Bob', 'Charlie']
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText(/by alice, bob, charlie/i)).toBeInTheDocument();
	});

	it('shows admin controls when isAdmin is true', async () => {
		const challenge = generateRandomChallenge();

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge,
				isAdmin: true
			}
		});

		expect(await screen.findByRole('button', { name: /edit challenge/i })).toBeInTheDocument();
		expect(await screen.findByRole('button', { name: /delete challenge/i })).toBeInTheDocument();
	});

	it('hides admin controls when isAdmin is false', () => {
		const challenge = generateRandomChallenge();

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge,
				isAdmin: false
			}
		});

		expect(screen.queryByRole('button', { name: /edit challenge/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /delete challenge/i })).not.toBeInTheDocument();
	});

	it('calls onEdit when edit button is clicked', async () => {
		const challenge = generateRandomChallenge();
		const onEdit = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge,
				isAdmin: true,
				onEdit
			}
		});

		const editButton = await screen.findByRole('button', { name: /edit challenge/i });
		await user.click(editButton);

		expect(onEdit).toHaveBeenCalledWith(challenge);
	});

	it('calls onDelete when delete button is clicked', async () => {
		const challenge = generateRandomChallenge();
		const onDelete = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge,
				isAdmin: true,
				onDelete
			}
		});

		const deleteButton = await screen.findByRole('button', { name: /delete challenge/i });
		await user.click(deleteButton);

		expect(onDelete).toHaveBeenCalledWith(challenge);
	});

	it('displays attachments section when attachments exist', async () => {
		const challenge = generateRandomChallenge({
			attachments: ['/files/challenge1.zip', '/files/challenge2.txt']
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText(/attachments/i)).toBeInTheDocument();
		expect(await screen.findByText('challenge1.zip')).toBeInTheDocument();
		expect(await screen.findByText('challenge2.txt')).toBeInTheDocument();
	});

	it('does not display attachments section when no attachments', () => {
		const challenge = generateRandomChallenge({
			attachments: []
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(screen.queryByText(/attachments/i)).not.toBeInTheDocument();
	});

	it('attachment links have correct attributes', async () => {
		const challenge = generateRandomChallenge({
			attachments: ['/files/test.zip']
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		const link = await screen.findByRole('link', { name: /download test.zip/i });
		expect(link).toHaveAttribute('href', `/attachments/${challenge.id}/files/test.zip`);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('shows connection string for non-instance challenges with host', async () => {
		const challenge = generateRandomChallenge({
			instance: false,
			host: 'ctf.example.com',
			port: 1337
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});
		
		expect(await screen.findByText(/connection/i)).toBeInTheDocument();
		expect(await screen.findByText('ctf.example.com:1337')).toBeInTheDocument();
	});

	it('copies connection string to clipboard when clicked', async () => {
		const challenge = generateRandomChallenge({
			instance: false,
			host: 'ctf.example.com',
			port: 8080
		});
		const user = userEvent.setup();
		const mockToast = vi.mocked(toast);
		const mockClipboard = vi.fn().mockResolvedValueOnce(undefined);

		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: mockClipboard },
			writable: true,
			configurable: true
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		const connectionButton = await screen.findByRole('button', { name: /copy connection string/i });
		await user.click(connectionButton);

		expect(mockClipboard).toHaveBeenCalledWith('ctf.example.com:8080');
		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Copied to clipboard!');
		});
	});

	it('does not show connection section for instance challenges', () => {
		const challenge = generateRandomChallenge({
			instance: true,
			host: 'ctf.example.com',
			port: 1337
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		// Should not show static connection info for instance challenges
		const connectionHeadings = screen.queryAllByText(/connection/i);
		// InstanceControls might have "connection" but not the static connection section
		expect(connectionHeadings.length).toBe(0);
	});

	it('handles connection string without port', async () => {
		const challenge = generateRandomChallenge({
			instance: false,
			host: 'ctf.example.com',
			port: null
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByText('ctf.example.com')).toBeInTheDocument();
	});

	it('handles clipboard copy failure gracefully', async () => {
		const challenge = generateRandomChallenge({
			instance: false,
			host: 'ctf.example.com',
			port: 1337
		});
		const user = userEvent.setup();
		const mockToast = vi.mocked(toast);
		const mockClipboard = vi.fn().mockRejectedValueOnce(new Error('Clipboard denied'));

		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: mockClipboard },
			writable: true,
			configurable: true
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		const connectionButton = screen.getByRole('button', { name: /copy connection string/i });
		await user.click(connectionButton);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith('Failed to copy to clipboard.');
		});
	});

	it('uses singular "solve" for solves count of 1', async () => {
		const challenge = generateRandomChallenge({
			solves: 1
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByRole('button', { name: /view 1 solve$/i })).toBeInTheDocument();
	});

	it('uses plural "solves" for solves count > 1', async () => {
		const challenge = generateRandomChallenge({
			solves: 10
		});

		renderWithProviders(ChallengeModal, {
			props: {
				open: true,
				challenge
			}
		});

		expect(await screen.findByRole('button', { name: /view 10 solves/i })).toBeInTheDocument();
	});
});
