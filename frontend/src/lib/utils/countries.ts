import countries from '$lib/data/countries.json';

export type Country = { name: string; iso2: string; iso3?: string; emoji?: string };

export type CountryItem = {
	value: string;
	label: string;
	iso2: string;
};

const sortedCountryItems: CountryItem[] = (countries as Country[])
	.filter((c) => c.iso3)
	.map((c) => ({
		value: c.iso3!.toUpperCase(),
		label: c.name,
		iso2: c.iso2.toUpperCase()
	}))
	.sort((a, b) => a.label.localeCompare(b.label));

const countryMapByIso3 = new Map<string, CountryItem>(
	sortedCountryItems.map((c) => [c.value, c])
);

const countryIso2MapByIso3 = new Map<string, string>(
	(countries as Country[])
		.filter((c) => c.iso3)
		.map((c) => [c.iso3!.toUpperCase(), c.iso2.toUpperCase()])
);

export function getCountryItems(): CountryItem[] {
	return sortedCountryItems;
}

export function filterCountries(items: CountryItem[], search: string): CountryItem[] {
	if (!search.trim()) return items;

	const lowerSearch = search.toLowerCase();
	return items.filter(
		(c) =>
			c.label.toLowerCase().includes(lowerSearch) || c.value.toLowerCase().includes(lowerSearch)
	);
}

export function getCountryByIso3(iso3: string): CountryItem | null {
	if (!iso3) return null;
	return countryMapByIso3.get(iso3.toUpperCase()) ?? null;
}

export function getCountryIso2(iso3: string): string | null {
	if (!iso3) return null;
	return countryIso2MapByIso3.get(iso3.toUpperCase()) ?? null;
}
