import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export interface SponsorContent {
	name: string;
	url: string;
	logo: string;
	description: string;
}

export interface SiteContent {
	brand: {
		shortName: string;
		browserTitle: string;
		footerText: string;
		logoAlt: string;
		adminTitleSuffix: string;
	};
	home: {
		heroTitle: string;
		heroDescription: string;
		primaryCtaLabel: string;
		primaryCtaHref: string;
		secondaryCtaLabel: string;
		secondaryCtaHref: string;
		rulesTitle: string;
		rulesMarkdown: string;
		sponsorsTitle: string;
		sponsors: SponsorContent[];
	};
	auth: {
		signUpDescription: string;
	};
	settings: {
		appearanceDescription: string;
	};
}

const defaultSiteContent: SiteContent = {
	brand: {
		shortName: 'TRXd',
		browserTitle: 'TRXD',
		footerText: 'TRXd Platform © 2026',
		logoAlt: 'TRXD Logo',
		adminTitleSuffix: 'TRXd Admin'
	},
	home: {
		heroTitle: 'Welcome to TRXD',
		heroDescription: 'A platform for hackers and cybersecurity enthusiasts',
		primaryCtaLabel: 'View Challenges',
		primaryCtaHref: '/challenges',
		secondaryCtaLabel: 'Scoreboard',
		secondaryCtaHref: '/scoreboard',
		rulesTitle: '',
		rulesMarkdown: '',
		sponsorsTitle: '',
		sponsors: []
	},
	auth: {
		signUpDescription: 'Join TRXD and start hacking'
	},
	settings: {
		appearanceDescription: 'Customize how TRXd looks for you.'
	}
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function normalizeSponsor(value: unknown): SponsorContent | null {
	if (!isRecord(value)) return null;

	const name = asString(value.name, '').trim();
	const url = asString(value.url, '');
	const logo = asString(value.logo, '');
	const description = asString(value.description, '');

	if (!name && !url && !logo && !description) return null;

	return {
		name: name || 'Sponsor',
		url,
		logo,
		description
	};
}

export function normalizeSiteContent(value: unknown): SiteContent {
	const source = isRecord(value) ? value : {};
	const brand = isRecord(source.brand) ? source.brand : {};
	const home = isRecord(source.home) ? source.home : {};
	const auth = isRecord(source.auth) ? source.auth : {};
	const settings = isRecord(source.settings) ? source.settings : {};

	const sponsors = Array.isArray(home.sponsors)
		? home.sponsors.map(normalizeSponsor).filter((item): item is SponsorContent => item !== null)
		: defaultSiteContent.home.sponsors;

	return {
		brand: {
			shortName: asString(brand.shortName, defaultSiteContent.brand.shortName),
			browserTitle: asString(brand.browserTitle, defaultSiteContent.brand.browserTitle),
			footerText: asString(brand.footerText, defaultSiteContent.brand.footerText),
			logoAlt: asString(brand.logoAlt, defaultSiteContent.brand.logoAlt),
			adminTitleSuffix: asString(brand.adminTitleSuffix, defaultSiteContent.brand.adminTitleSuffix)
		},
		home: {
			heroTitle: asString(home.heroTitle, defaultSiteContent.home.heroTitle),
			heroDescription: asString(home.heroDescription, defaultSiteContent.home.heroDescription),
			primaryCtaLabel: asString(home.primaryCtaLabel, defaultSiteContent.home.primaryCtaLabel),
			primaryCtaHref: asString(home.primaryCtaHref, defaultSiteContent.home.primaryCtaHref),
			secondaryCtaLabel: asString(
				home.secondaryCtaLabel,
				defaultSiteContent.home.secondaryCtaLabel
			),
			secondaryCtaHref: asString(
				home.secondaryCtaHref,
				defaultSiteContent.home.secondaryCtaHref
			),
			rulesTitle: asString(home.rulesTitle, defaultSiteContent.home.rulesTitle),
			rulesMarkdown: asString(home.rulesMarkdown, defaultSiteContent.home.rulesMarkdown),
			sponsorsTitle: asString(home.sponsorsTitle, defaultSiteContent.home.sponsorsTitle),
			sponsors
		},
		auth: {
			signUpDescription: asString(auth.signUpDescription, defaultSiteContent.auth.signUpDescription)
		},
		settings: {
			appearanceDescription: asString(
				settings.appearanceDescription,
				defaultSiteContent.settings.appearanceDescription
			)
		}
	};
}

function createSiteContentStore() {
	const { subscribe, set } = writable<SiteContent>(defaultSiteContent);

	let current = defaultSiteContent;
	let loaded = false;
	let inFlight: Promise<SiteContent> | null = null;

	async function load(force = false): Promise<SiteContent> {
		if (!browser) return defaultSiteContent;
		if (!force && loaded) return current;
		if (!force && inFlight) return inFlight;

		inFlight = (async () => {
			try {
				const response = await fetch(`/site-content.json?t=${Date.now()}`, {
					cache: 'no-store'
				});

				if (!response.ok) {
					throw new Error(`Failed to load site-content.json (${response.status})`);
				}

				const data = normalizeSiteContent(await response.json());
				current = data;
				set(data);
				loaded = true;
				return data;
			} catch {
				current = defaultSiteContent;
				set(defaultSiteContent);
				loaded = true;
				return defaultSiteContent;
			} finally {
				inFlight = null;
			}
		})();

		return inFlight;
	}

	return {
		subscribe,
		load,
		reset() {
			current = defaultSiteContent;
			loaded = false;
			set(defaultSiteContent);
		}
	};
}

export const siteContent = createSiteContentStore();
export const siteContentDefaults = defaultSiteContent;
