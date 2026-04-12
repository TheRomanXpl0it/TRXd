import { render } from '@testing-library/svelte';
import TestWrapper from './TestWrapper.svelte';
import { tick } from 'svelte';

/**
 * Custom render function that wraps components in necessary providers.
 * Supports both call patterns used across the test suite:
 *   renderWithProviders(Component, { props: { key: val } })  ← unwraps correctly
 *   renderWithProviders(Component, { key: val })             ← passes directly
 */
export function renderWithProviders(Component: any, options: Record<string, any> = {}) {
	const initialProps = 'props' in options ? options.props : options;
	const result = render(TestWrapper, {
		props: {
			Component,
			innerProps: initialProps ?? {}
		}
	});

	return {
		...result,
		rerender: async (newOptions: Record<string, any>) => {
			const newProps = 'props' in newOptions ? newOptions.props : newOptions;
			result.rerender({
				Component,
				innerProps: newProps ?? {}
			});
			await tick();
			await tick();
		}
	};
}
