<script module lang="ts">
	declare const __GIT_HASH__: string;
</script>

<script lang="ts">
	import { siteContent } from '$lib/site-content';
	import { authState } from '$lib/stores/auth';
	import { renderMarkdown } from '$lib/utils/markdown';

	const gitHash = __GIT_HASH__;
	const isAdmin = $derived(authState.user?.role === 'Admin');
	const hasRules = $derived(Boolean($siteContent.home.rulesTitle || $siteContent.home.rulesMarkdown));
	const hasSponsors = $derived($siteContent.home.sponsors.length > 0);
</script>

<svelte:head>
	<link rel="preload" as="image" href="/trx.svg" />
</svelte:head>

<!-- NOTE: Is this really useful? -->

<div class="flex flex-col items-center justify-center py-8">
	<!-- Hero Section -->
	<div class="mb-8 text-center">
		<img
			src="/trx.svg"
			alt={$siteContent.brand.logoAlt}
			width="256"
			height="256"
			loading="eager"
			fetchpriority="high"
			class="mx-auto mb-8 h-auto w-48 sm:w-64"
		/>

		<h1 class="mb-4 text-4xl font-black tracking-tighter text-gray-900 sm:text-6xl dark:text-white">
			{$siteContent.home.heroTitle}
		</h1>

		<p class="mx-auto mb-6 max-w-2xl text-xl text-gray-600 dark:text-gray-300">
			{$siteContent.home.heroDescription}
		</p>

		<div class="flex flex-wrap justify-center gap-4">
			<a
				href={$siteContent.home.primaryCtaHref}
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-semibold transition-colors"
			>
				{$siteContent.home.primaryCtaLabel}
			</a>
			<a
				href={$siteContent.home.secondaryCtaHref}
				class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-6 py-3 font-semibold transition-colors"
			>
				{$siteContent.home.secondaryCtaLabel}
			</a>
		</div>
	</div>

	{#if hasRules}
		<section class="mb-8 w-full max-w-4xl rounded-2xl border border-gray-200/70 bg-white/60 p-6 shadow-sm dark:border-gray-800 dark:bg-white/5">
			{#if $siteContent.home.rulesTitle}
				<h2 class="mb-4 text-2xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
					{$siteContent.home.rulesTitle}
				</h2>
			{/if}

			{#if $siteContent.home.rulesMarkdown}
				<div class="prose prose-gray dark:prose-invert max-w-none">
					{@html renderMarkdown($siteContent.home.rulesMarkdown)}
				</div>
			{/if}
		</section>
	{/if}

	{#if hasSponsors}
		<section class="w-full max-w-5xl">
			{#if $siteContent.home.sponsorsTitle}
				<h2 class="mb-4 text-center text-2xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
					{$siteContent.home.sponsorsTitle}
				</h2>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each $siteContent.home.sponsors as sponsor}
					<a
						href={sponsor.url || undefined}
						class="rounded-2xl border border-gray-200/70 bg-white/60 p-5 text-left shadow-sm transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-white/5 dark:hover:border-gray-700"
						target={sponsor.url ? '_blank' : undefined}
						rel={sponsor.url ? 'noreferrer' : undefined}
					>
						<div class="flex items-center gap-4">
							{#if sponsor.logo}
								<img
									src={sponsor.logo}
									alt={sponsor.name}
									class="h-12 w-12 rounded-lg object-contain"
								/>
							{/if}
							<div>
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{sponsor.name}
								</h3>
								{#if sponsor.description}
									<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
										{sponsor.description}
									</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if isAdmin}
		<div class="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
			<span title={gitHash}>hash: {gitHash}</span>
		</div>
	{/if}
</div>
