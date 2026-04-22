import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { screen } from '@testing-library/svelte';
import { renderWithProviders } from '../../render';

vi.hoisted(() => {
	(globalThis as { __GIT_HASH__?: string }).__GIT_HASH__ = 'test-hash';
});

import Page from '../../../../src/routes/home/+page.svelte';
import {
	normalizeSiteContent,
	siteContent,
	siteContentDefaults,
	type SiteContent
} from '$lib/site-content';
import { authState } from '$lib/stores/auth';

function cloneSiteContent(value: SiteContent): SiteContent {
	return JSON.parse(JSON.stringify(value)) as SiteContent;
}

describe('Home Page Sponsors', () => {
	const initialContent = cloneSiteContent(get(siteContent));

	beforeEach(() => {
		authState.user = null;

		siteContent.set(
			normalizeSiteContent({
				...cloneSiteContent(siteContentDefaults),
				home: {
					...cloneSiteContent(siteContentDefaults).home,
					sponsorsTitle: 'Sponsors',
					sponsors: [
						{
							name: 'Markdown Sponsor',
							url: 'https://sponsor.example',
							logo: '',
							description:
								'Primary sponsor with a [careers link](https://jobs.example) and **research** support.'
						}
					]
				}
			})
		);
	});

	afterEach(() => {
		siteContent.set(cloneSiteContent(initialContent));
	});

	it('renders markdown links inside sponsor descriptions', async () => {
		renderWithProviders(Page);

		expect(await screen.findByRole('link', { name: 'Markdown Sponsor' })).toHaveAttribute(
			'href',
			'https://sponsor.example'
		);
		expect(await screen.findByRole('link', { name: 'careers link' })).toHaveAttribute(
			'href',
			'https://jobs.example'
		);
		expect(screen.getByText('research')).toBeInTheDocument();
	});
});
