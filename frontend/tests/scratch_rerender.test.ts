import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import DeleteChallengeDialog from '$lib/components/challenges/DeleteChallengeDialog.svelte';

describe('Rerender Test', () => {
    it('resets state on close', async () => {
        const { rerender } = render(DeleteChallengeDialog, {
            props: {
                open: true,
                toDelete: { name: 'Test' },
                deleting: false
            }
        });

        const input = (await screen.findByLabelText(/confirmation/i)) as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'some text' } }); 
        await tick();
        
        await rerender({
            open: false,
            toDelete: { name: 'Test' },
            deleting: false
        });
        await tick();
        await tick();

        await rerender({
            open: true,
            toDelete: { name: 'Test' },
            deleting: false
        });
        await tick();
        await tick();

        expect(input.value).toBe('');
    });
});
