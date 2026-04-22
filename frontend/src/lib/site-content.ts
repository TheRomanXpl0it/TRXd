import { writable } from 'svelte/store';
import rawContent from '../../static/site-content.json';

export interface SponsorContent {
	name: string;
	url: string;
	logo: string;
	description: string;
}

export interface PrizeContent {
	amount: string;
	label: string;
	desc: string;
}

export interface SiteContent {
	brand: {
		shortName: string;
		browserTitle: string;
		footerText: string;
		logoAlt: string;
		adminTitleSuffix: string;
		heroSubtitle: string;
		discordUrl: string;
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
		eventTimelineValue: string;
		eventTimelineLabel: string;
		eventDurationValue: string;
		eventDurationLabel: string;
		eventFormatValue: string;
		eventFormatLabel: string;
		prizes: PrizeContent[];
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
		adminTitleSuffix: 'TRXd Admin',
		heroSubtitle: 'A CTF BY THEROMANXPL0IT',
		discordUrl: 'https://discord.gg/trx'
	},
	home: {
		heroTitle: 'Welcome to TRXD',
		heroDescription: 'A platform for hackers and cybersecurity enthusiasts',
		primaryCtaLabel: 'Play',
		primaryCtaHref: '/home',
		secondaryCtaLabel: 'Scoreboard',
		secondaryCtaHref: '/scoreboard',
		rulesTitle: '',
		rulesMarkdown: '',
		sponsorsTitle: '',
		sponsors: [],
		eventTimelineValue: 'April 24 - 26, 2026',
		eventTimelineLabel: '19:00 UTC Start',
		eventDurationValue: '48 Hours',
		eventDurationLabel: 'Non-stop Hallucinations',
		eventFormatValue: 'Jeopardy CTF',
		eventFormatLabel: 'Multiple Skill Categories',
		prizes: []
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

function normalizePrize(value: unknown): PrizeContent | null {
	if (!isRecord(value)) return null;

	const amount = asString(value.amount, '').trim();
	const label = asString(value.label, '');
	const desc = asString(value.desc, '');

	if (!amount && !label && !desc) return null;

	return {
		amount,
		label,
		desc
	};
}

function normalizeLegacyPrizes(home: Record<string, unknown>): PrizeContent[] {
	const legacyPrizes = [
		{
			amount: asString(home.prize1Amount, ''),
			label: asString(home.prize1Label, ''),
			desc: asString(home.prize1Desc, '')
		},
		{
			amount: asString(home.prize2Amount, ''),
			label: asString(home.prize2Label, ''),
			desc: asString(home.prize2Desc, '')
		},
		{
			amount: asString(home.prize3Amount, ''),
			label: asString(home.prize3Label, ''),
			desc: asString(home.prize3Desc, '')
		}
	];

	return legacyPrizes.filter((prize) => prize.amount || prize.label || prize.desc);
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
	const prizes = Array.isArray(home.prizes)
		? home.prizes.map(normalizePrize).filter((item): item is PrizeContent => item !== null)
		: normalizeLegacyPrizes(home);

	return {
		brand: {
			shortName: asString(brand.shortName, defaultSiteContent.brand.shortName),
			browserTitle: asString(brand.browserTitle, defaultSiteContent.brand.browserTitle),
			footerText: asString(brand.footerText, defaultSiteContent.brand.footerText),
			logoAlt: asString(brand.logoAlt, defaultSiteContent.brand.logoAlt),
			adminTitleSuffix: asString(brand.adminTitleSuffix, defaultSiteContent.brand.adminTitleSuffix),
			heroSubtitle: asString(brand.heroSubtitle, defaultSiteContent.brand.heroSubtitle),
			discordUrl: asString(brand.discordUrl, defaultSiteContent.brand.discordUrl)
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
			sponsors,
			eventTimelineValue: asString(
				home.eventTimelineValue,
				defaultSiteContent.home.eventTimelineValue
			),
			eventTimelineLabel: asString(
				home.eventTimelineLabel,
				defaultSiteContent.home.eventTimelineLabel
			),
			eventDurationValue: asString(
				home.eventDurationValue,
				defaultSiteContent.home.eventDurationValue
			),
			eventDurationLabel: asString(
				home.eventDurationLabel,
				defaultSiteContent.home.eventDurationLabel
			),
			eventFormatValue: asString(home.eventFormatValue, defaultSiteContent.home.eventFormatValue),
			eventFormatLabel: asString(home.eventFormatLabel, defaultSiteContent.home.eventFormatLabel),
			prizes
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

export const siteContent = writable<SiteContent>(normalizeSiteContent(rawContent));
export const siteContentDefaults = defaultSiteContent;
