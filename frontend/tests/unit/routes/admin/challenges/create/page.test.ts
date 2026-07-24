import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../../../render';
import Page from '../../../../../../src/routes/admin/challenges/create/+page.svelte';
import {
	createChallenge,
	getChallenges,
	updateChallenge,
	uploadAttachments
} from '$lib/challenges';
import { createFlags } from '$lib/flags';
import { getCategories } from '$lib/categories';
import { goto } from '$app/navigation';

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/challenges', () => ({
	createChallenge: vi.fn(),
	getChallenges: vi.fn(),
	updateChallenge: vi.fn(),
	uploadAttachments: vi.fn()
}));

vi.mock('$lib/flags', () => ({
	createFlags: vi.fn()
}));

vi.mock('$lib/categories', () => ({
	getCategories: vi.fn()
}));

vi.mock('$lib/components/MonacoEditor.svelte', () => ({
	default: {
		name: 'MonacoEditor',
		render: () => ({
			html: '<div data-testid="monaco-editor"></div>',
			css: { code: '', map: null },
			head: ''
		})
	}
}));

describe('Admin Challenge Create Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCategories).mockResolvedValue(['Web']);
		vi.mocked(createChallenge).mockResolvedValue({} as any);
		vi.mocked(getChallenges).mockResolvedValue([{ id: 42, name: 'Container Test' }] as any);
		vi.mocked(updateChallenge).mockResolvedValue(undefined as any);
		vi.mocked(createFlags).mockResolvedValue(undefined as any);
		vi.mocked(uploadAttachments).mockResolvedValue(undefined as any);
	});

	it('submits connection settings for container challenges', async () => {
		const user = userEvent.setup();

		renderWithProviders(Page);

		await waitFor(() => {
			expect(getCategories).toHaveBeenCalledTimes(1);
		});

		await user.type(screen.getByLabelText(/challenge name/i), 'Container Test');

		const [categorySelect, instanceTypeSelect] = screen.getAllByRole('combobox');

		await user.click(categorySelect);
		await user.click(await screen.findByText('Web'));

		await user.click(instanceTypeSelect);
		await user.click(await screen.findByText('Container'));

		await user.click(screen.getByRole('button', { name: /deployment/i }));

		await user.type(
			screen.getByLabelText(/docker image name/i),
			'registry.example.com/chall:latest'
		);
		await user.type(screen.getByLabelText(/connecting host/i), 'container.trxd.cc');
		await user.type(screen.getByLabelText(/^port$/i), '31337');

		const connTypeSelect = screen.getByRole('combobox');
		await user.click(connTypeSelect);
		await user.click(await screen.findByText('TCP'));

		await user.click(screen.getByRole('button', { name: /^create challenge$/i }));

		await waitFor(() => {
			expect(createChallenge).toHaveBeenCalledWith(
				'Container Test',
				'Web',
				'',
				'Container',
				500,
				'Dynamic'
			);
			expect(updateChallenge).toHaveBeenCalledWith(
				expect.objectContaining({
					chall_id: 42,
					instance_type: 'Container',
					image: 'registry.example.com/chall:latest',
					host: 'container.trxd.cc',
					port: 31337,
					conn_type: 'TCP'
				})
			);
			expect(goto).toHaveBeenCalledWith('/challenges');
		});
	}, 15000);
});
