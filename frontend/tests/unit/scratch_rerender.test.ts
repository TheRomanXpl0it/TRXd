import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test } from 'vitest';
import TestWrapper from './TestWrapper.svelte';
import { renderWithProviders } from './render';
import { mount } from 'svelte';

// Mock component
// @ts-ignore
import MockComponent from './MockComponent.svelte';

test('rerender updates props reactively', async () => {
    const { rerender } = renderWithProviders(MockComponent, { name: 'Initial' });
    expect(screen.getByText('Hello Initial')).toBeInTheDocument();

    await rerender({ name: 'Updated' });
    expect(await screen.findByText('Hello Updated', {}, { timeout: 3000 })).toBeInTheDocument();
});
