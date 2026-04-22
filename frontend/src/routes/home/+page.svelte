<script module lang="ts">
	declare const __GIT_HASH__: string;
</script>

<script lang="ts">
	import Markdown from '$lib/components/Markdown.svelte';
	import { siteContent } from '$lib/site-content';
	import { authState } from '$lib/stores/auth';

	const gitHash = __GIT_HASH__;
	const isAdmin = $derived(authState.user?.role === 'Admin');
	const hasRules = $derived(Boolean($siteContent.home.rulesTitle || $siteContent.home.rulesMarkdown));
	const hasSponsors = $derived($siteContent.home.sponsors.length > 0);
	const hasSecondaryContent = $derived(hasRules || hasSponsors);
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
				href="/challenges"
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-semibold transition-colors"
			>
				View Challenges
			</a>
			<a
				href={$siteContent.home.secondaryCtaHref}
				class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-6 py-3 font-semibold transition-colors"
			>
				{$siteContent.home.secondaryCtaLabel}
			</a>
		</div>
	</div>

		{#if hasSecondaryContent}
			<div class="mt-12 flex w-full flex-col items-center gap-8 sm:mt-14 lg:mt-16">
			{#if hasRules}
				<section class="w-full max-w-4xl rounded-2xl border border-gray-200/70 bg-white/60 p-6 shadow-sm dark:border-gray-800 dark:bg-white/5">
					{#if $siteContent.home.rulesTitle}
						<h2
							class="mb-4 text-2xl font-black tracking-tighter text-gray-900 uppercase dark:text-white"
						>
							{$siteContent.home.rulesTitle}
						</h2>
					{/if}

					{#if $siteContent.home.rulesMarkdown}
						<Markdown
							content={$siteContent.home.rulesMarkdown}
							class="max-w-none text-gray-600 dark:text-gray-300"
						/>
					{/if}
				</section>
			{/if}

			{#if hasSponsors}
				<section class="w-full max-w-4xl">
					{#if $siteContent.home.sponsorsTitle}
						<h2
							class="mb-6 text-center text-3xl font-black tracking-tighter text-gray-900 uppercase sm:text-4xl dark:text-white"
						>
							{$siteContent.home.sponsorsTitle}
						</h2>
					{/if}

					<div class="flex flex-col gap-6">
						{#each $siteContent.home.sponsors as sponsor}
							<a
								href={sponsor.url || undefined}
								class="w-full rounded-3xl border border-gray-200/70 bg-white/60 p-6 text-left shadow-sm transition-colors hover:border-gray-300 sm:p-7 dark:border-gray-800 dark:bg-white/5 dark:hover:border-gray-700"
								target={sponsor.url ? '_blank' : undefined}
								rel={sponsor.url ? 'noreferrer' : undefined}
							>
								<div class="flex items-center gap-5">
									{#if sponsor.logo}
										<div
											class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gray-200/80 bg-white/80 dark:border-gray-700 dark:bg-white/10"
										>
											<img
												src={sponsor.logo}
												alt={sponsor.name}
												class="h-14 w-14 rounded-xl object-contain sm:h-16 sm:w-16"
											/>
										</div>
									{/if}
									<div>
										<h3
											class="text-xl font-black uppercase tracking-tighter text-gray-900 sm:text-2xl dark:text-white"
										>
											{sponsor.name}
										</h3>
										{#if sponsor.description}
											<p class="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-300">
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
		</div>
	{/if}

	{#if isAdmin}
		<div class="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
			<span title={gitHash}>hash: {gitHash}</span>
		</div>
	{/if}
</div>
