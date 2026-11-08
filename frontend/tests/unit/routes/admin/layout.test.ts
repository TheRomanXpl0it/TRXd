import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from '../../../../src/routes/admin/+layout.svelte';

const { pageStore, authState } = vi.hoisted(() => {
	let value = { url: new URL('http://localhost/admin') };
	const subs = new Set<(val: any) => void>();
	return {
		pageStore: {
			subscribe(fn: (val: any) => void) {
				subs.add(fn);
				fn(value);
				return () => subs.delete(fn);
			},
			set(val: any) {
				value = val;
				subs.forEach((fn) => fn(value));
			}
		},
		authState: {
			ready: true,
			user: null as any,
			userMode: false
		}
	};
});

vi.mock('$lib/stores/auth', () => ({
	authState
}));

vi.mock('$app/stores', () => ({
	page: pageStore
}));

describe('Admin +layout.svelte', () => {
	beforeEach(() => {
		authState.ready = true;
		authState.user = null;
		authState.userMode = false;
		pageStore.set({ url: new URL('http://localhost/admin') });
	});

	it('renders 404 NotFound when regular player visits /admin', async () => {
		authState.user = { role: 'User' };
		render(AdminLayout);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/page not found/i)).toBeInTheDocument();
		expect(screen.queryByText('Overview')).not.toBeInTheDocument();
	});

	it('renders 404 NotFound when unauthenticated visitor visits /admin', async () => {
		authState.user = null;
		render(AdminLayout);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/page not found/i)).toBeInTheDocument();
	});

	it('renders 404 NotFound when Author visits admin-only route /admin/configs', async () => {
		authState.user = { role: 'Author' };
		pageStore.set({ url: new URL('http://localhost/admin/configs') });
		render(AdminLayout);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
	});

	it('renders admin navigation when Author visits /admin', async () => {
		authState.user = { role: 'Author' };
		pageStore.set({ url: new URL('http://localhost/admin') });
		render(AdminLayout);

		expect(screen.queryByText('404')).not.toBeInTheDocument();
		expect(screen.getByText('Overview')).toBeInTheDocument();
		expect(screen.getByText('Manage challenges')).toBeInTheDocument();
	});

	it('renders full navigation when Admin visits /admin/configs', async () => {
		authState.user = { role: 'Admin' };
		pageStore.set({ url: new URL('http://localhost/admin/configs') });
		render(AdminLayout);

		expect(screen.queryByText('404')).not.toBeInTheDocument();
		expect(screen.getByText('Configuration')).toBeInTheDocument();
	});
});
