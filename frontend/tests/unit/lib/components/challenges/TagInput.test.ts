import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../render';
import TagInput from '$lib/components/challenges/TagInput.svelte';

describe('TagInput Component', () => {
	it('renders existing tags inline and allows removing them', async () => {
		const user = userEvent.setup();
		let tags = ['web', 'crypto'];

		renderWithProviders(TagInput, {
			props: {
				value: tags,
				placeholder: 'Add tags...',
				id: 'test-tags'
			}
		});

		expect(screen.getByText('web')).toBeInTheDocument();
		expect(screen.getByText('crypto')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Remove web' }));
		expect(screen.queryByText('web')).not.toBeInTheDocument();
		expect(screen.getByText('crypto')).toBeInTheDocument();
	});

	it('creates inline tag on pressing Enter in the textbox', async () => {
		const user = userEvent.setup();
		let tags: string[] = [];

		renderWithProviders(TagInput, {
			props: {
				value: tags,
				placeholder: 'Add tags...',
				id: 'test-tags'
			}
		});

		const input = screen.getByPlaceholderText('Add tags...');
		await user.type(input, 'pwn{Enter}');

		expect(await screen.findByText('pwn')).toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('creates inline tag on typing comma', async () => {
		const user = userEvent.setup();
		let tags: string[] = [];

		renderWithProviders(TagInput, {
			props: {
				value: tags,
				placeholder: 'Add tags...'
			}
		});

		const input = screen.getByPlaceholderText('Add tags...');
		await user.type(input, 'rev,');

		expect(await screen.findByText('rev')).toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('removes last tag on backspace when input is empty', async () => {
		const user = userEvent.setup();
		let tags = ['web', 'pwn'];

		renderWithProviders(TagInput, {
			props: {
				value: tags
			}
		});

		const input = screen.getByRole('textbox');
		await user.click(input);
		await user.keyboard('{Backspace}');

		expect(screen.getByText('web')).toBeInTheDocument();
		expect(screen.queryByText('pwn')).not.toBeInTheDocument();
	});

	it('does not add duplicate tags', async () => {
		const user = userEvent.setup();
		let tags = ['web'];

		renderWithProviders(TagInput, {
			props: {
				value: tags
			}
		});

		const input = screen.getByRole('textbox');
		await user.type(input, 'web{Enter}');

		const chips = screen.getAllByText('web');
		expect(chips).toHaveLength(1);
	});
});
