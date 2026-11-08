<script lang="ts">
	import Markdown from '$lib/components/Markdown.svelte';
	import { siteContent } from '$lib/site-content';

	// Reactive counts for conditional layout adjustment
	$: activeDetailsCount = [
		$siteContent.home.eventTimelineValue,
		$siteContent.home.eventDurationValue,
		$siteContent.home.eventFormatValue
	].filter(Boolean).length;

	$: prizes = ($siteContent.home.prizes ?? []).filter((p: any) => p?.amount);
	$: activePrizesCount = prizes.length;
	$: hasMainSectionsBeforeSponsors = activeDetailsCount > 0 || activePrizesCount > 0;
	$: collapseSponsorsUnderHero =
		$siteContent.home.sponsors.length > 0 && !hasMainSectionsBeforeSponsors;

</script>

<div id="landing-page">
	<div class="container-custom">
		<!-- Full-Screen Hero -->
		<header class:hero-shell--compact={collapseSponsorsUnderHero} class="hero-shell">
			<div class="flex flex-col items-center space-y-8">
				<img src="/trx.svg" alt="TRX Logo" class="h-32 w-32" />
				<div>
					<h1
						class="hero-title mb-3 text-center text-5xl font-black uppercase tracking-tighter sm:text-6xl"
					>
						{$siteContent.home.heroTitle}
					</h1>
					{#if $siteContent.brand.heroSubtitle}
						<p
							class="text-zinc-muted mt-4 inline-block border-t border-zinc-800 px-12 pt-6 text-center text-xs font-bold uppercase tracking-widest opacity-80"
						>
							{$siteContent.brand.heroSubtitle}
						</p>
					{/if}
				</div>
			</div>

			<!-- Integrated Actions -->
			<div class="flex translate-y-4 flex-col items-center gap-8">
				<a
					href={$siteContent.home.primaryCtaHref}
					class="ambient-button rounded-2xl px-14 py-5 font-black uppercase tracking-tight opacity-90 transition-all hover:opacity-100 active:scale-[0.98]"
				>
					{$siteContent.home.primaryCtaLabel}
				</a>
				{#if $siteContent.brand.discordUrl}
					<p class="text-zinc-muted text-xs font-bold uppercase tracking-widest opacity-60">
						Join the <a
							href={$siteContent.brand.discordUrl}
							class="decoration-[var(--alive-cell)]/30 text-[var(--lp-foreground)] underline decoration-2 underline-offset-8 transition-all hover:decoration-[var(--alive-cell)]"
						>
							Discord server
						</a>
					</p>
				{/if}
			</div>
		</header>

		<!-- Core Event Info -->
		<main class="space-y-20">
			{#if activeDetailsCount > 0}
				<!-- Details Grid -->
				<div
					class="grid grid-cols-1 {activeDetailsCount === 3
						? 'md:grid-cols-3'
						: 'md:grid-cols-2'} gap-8"
				>
					{#if $siteContent.home.eventTimelineValue}
						<div class="card-custom space-y-3 rounded-2xl p-8">
							<span class="text-zinc-muted text-[10px] font-black uppercase tracking-widest"
								>Timeline</span
							>
							<p class="text-lg font-bold">{$siteContent.home.eventTimelineValue}</p>
							<p class="text-zinc-muted text-sm font-medium">
								{$siteContent.home.eventTimelineLabel}
							</p>
						</div>
					{/if}
					{#if $siteContent.home.eventDurationValue}
						<div class="card-custom space-y-3 rounded-2xl p-8">
							<span class="text-zinc-muted text-[10px] font-black uppercase tracking-widest"
								>Duration</span
							>
							<p class="text-lg font-bold">{$siteContent.home.eventDurationValue}</p>
							<p class="text-zinc-muted text-sm font-medium">
								{$siteContent.home.eventDurationLabel}
							</p>
						</div>
					{/if}
					{#if $siteContent.home.eventFormatValue}
						<div class="card-custom space-y-3 rounded-2xl p-8">
							<span class="text-zinc-muted text-[10px] font-black uppercase tracking-widest"
								>Format</span
							>
							<p class="text-lg font-bold">{$siteContent.home.eventFormatValue}</p>
							<p class="text-zinc-muted text-sm font-medium">
								{$siteContent.home.eventFormatLabel}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if activePrizesCount > 0}
				<!-- Prizes Section -->
				<section class="space-y-10">
					<div class="space-y-2 text-center">
						<p class="text-2xl font-black uppercase tracking-tighter">Prizes</p>
					</div>
					<!-- Unified Bunker Layout -->
					<div class="card-custom shrink-0 overflow-hidden rounded-3xl">
						<div
							class="grid grid-cols-1 {activePrizesCount >= 3
								? 'md:grid-cols-3 md:divide-x'
								: activePrizesCount === 2
									? 'md:grid-cols-2 md:divide-x'
									: 'md:grid-cols-1'} divide-zinc-800/10 dark:divide-white/5"
						>
							{#each prizes as prize}
								<div class="flex flex-col items-center space-y-6 p-10 text-center">
									<div class="space-y-1">
										<p class="text-3xl font-black tracking-tighter">{prize.amount}</p>
										{#if prize.label}
											<p class="text-zinc-muted text-[10px] font-bold uppercase tracking-widest">
												{prize.label}
											</p>
										{/if}
									</div>
									{#if prize.desc}
										<p class="text-zinc-muted max-w-[140px] text-xs font-medium italic">
											{prize.desc}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			{#if $siteContent.home.sponsors.length > 0}
				<!-- Sponsors Section -->
				<section class="space-y-12">
					<div class="space-y-2 text-center">
						<h2 class="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
							{$siteContent.home.sponsorsTitle || 'Sponsors'}
						</h2>
					</div>
					<div class="mx-auto max-w-5xl space-y-6">
						{#each $siteContent.home.sponsors as sponsor}
							<div
								class="card-custom flex flex-col items-center gap-6 rounded-3xl p-8 text-center sm:flex-row sm:gap-10 sm:p-10 sm:text-left"
							>
								<div
									class="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/5 bg-zinc-800/20"
								>
									{#if sponsor.logo}
										<img src={sponsor.logo} alt={sponsor.name} class="h-20 w-20 object-contain" />
									{:else}
										<span class="text-[10px] font-bold italic tracking-widest text-zinc-500"
											>LOGO</span
										>
									{/if}
								</div>
								<div class="hidden h-16 w-px bg-zinc-800/20 sm:block dark:bg-white/5"></div>
								<div class="space-y-1">
									{#if sponsor.url}
										<a
											href={sponsor.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-lg font-black uppercase tracking-tighter opacity-80 transition-colors hover:text-[var(--alive-cell)]"
										>
											{sponsor.name}
										</a>
									{:else}
										<h3 class="text-lg font-black uppercase tracking-tighter opacity-80">
											{sponsor.name}
										</h3>
									{/if}
									{#if sponsor.description}
										<Markdown
											content={sponsor.description}
											class="text-zinc-muted text-lg font-medium leading-relaxed"
										/>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</main>

		<footer class="pb-12 pt-20 text-center opacity-30">
			<p class="text-[10px] font-bold uppercase tracking-widest">
				{$siteContent.brand.footerText}
			</p>
		</footer>
	</div>
</div>

<style>
	:global(:root) {
		--lp-background: #f7f7f8;
		--lp-foreground: #18181b;
		--secondary-text: #71717a;

		--alive-cell-light: #34d399;
		--alive-cell: #10b981;
		--alive-cell-dark: #065f46;

		--card-bg: #ffffffb8;
		--card-border: #e4e4e7b8;
		--badge-bg: #f4f4f5;

		--overlay-strong: #f7f7f8e0;
		--overlay-soft: #f7f7f833;

		--content-shadow: 0 24px 80px #00000014;
	}

	:global(.dark) {
		--lp-background: #050505;
		--lp-foreground: #fafafa;
		--secondary-text: #a1a1aa;

		--alive-cell-light: #2dd4bf;
		--alive-cell: #14b8a6;
		--alive-cell-dark: #0f766e;

		--card-bg: #0a0a0cb8;
		--card-border: #3f3f466b;
		--badge-bg: #18181b;

		--overlay-strong: #050505cc;
		--overlay-soft: #05050526;

		--content-shadow: 0 24px 80px #0000006b;
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not(.dark):not(.light)) {
			--lp-background: #050505;
			--lp-foreground: #fafafa;
			--secondary-text: #a1a1aa;

			--alive-cell-light: #2dd4bf;
			--alive-cell: #14b8a6;
			--alive-cell-dark: #0f766e;

			--card-bg: #0a0a0cb8;
			--card-border: #3f3f466b;
			--badge-bg: #18181b;

			--overlay-strong: #050505cc;
			--overlay-soft: #05050526;

			--content-shadow: 0 24px 80px #0000006b;
		}
	}

	:global(body:has(#landing-page)) {
		background-color: var(--lp-background);
	}

	#landing-page {
		min-height: 100vh;
		position: relative;
		color: var(--lp-foreground);
	}

	.container-custom {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		position: relative;
		z-index: 1;
	}

	.card-custom {
		background-color: var(--card-bg);
		border: 1px solid var(--card-border);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
		box-shadow: var(--content-shadow);
	}

	.text-zinc-muted {
		color: var(--secondary-text);
	}

	.border-zinc-800 {
		border-color: var(--card-border) !important;
	}

	.ambient-button {
		background-color: var(--lp-foreground) !important;
		color: var(--lp-background) !important;
	}

	header img {
		filter: drop-shadow(0 10px 28px #00000029);
	}

	.hero-title {
		text-shadow: 0 8px 30px #0000001a;
	}

	.ambient-button {
		box-shadow: 0 16px 36px #00000029;
	}

	.hero-shell {
		position: relative;
		min-height: 100vh;
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 3rem;
		padding: 4rem 0 9.5rem;
	}

	.hero-shell--compact {
		min-height: auto;
		margin-bottom: 1.25rem;
		padding-bottom: 3.5rem;
	}

	/* Unused hero sponsor/footer styles kept temporarily for reference.
		.hero-footer-row {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 4rem;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			pointer-events: none;
		}

		.hero-footer-row--centered {
			justify-content: center;
		}

		.hero-sponsor {
			display: flex;
			align-items: center;
			gap: 1rem;
			width: 100%;
			max-width: 17rem;
			padding: 1.15rem 1.3rem;
			border-radius: 1.5rem;
			text-align: left;
			pointer-events: auto;
		}

		.hero-sponsor--left {
			justify-self: start;
		}

		.hero-sponsor--right {
			flex-direction: row-reverse;
			text-align: right;
		}

		.hero-sponsor--centered {
			justify-content: center;
			text-align: center;
			max-width: 20rem;
		}

		.sponsor-logo-chip {
			height: 3.75rem;
			width: 3.75rem;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			border-radius: 1.15rem;
			background: var(--badge-bg);
			font-size: 0.56rem;
			font-weight: 800;
			letter-spacing: 0.22em;
			text-transform: uppercase;
			color: var(--secondary-text);
		}

		.sponsor-name {
			font-size: 0.95rem;
			font-weight: 900;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			line-height: 1.35;
		}
		*/

	@media (max-width: 767px) {
		.hero-shell {
			min-height: 100svh;
			margin-bottom: 1.5rem;
			justify-content: flex-start;
			gap: 2rem;
			padding-top: 4rem;
			padding-bottom: 10.2rem;
		}

		.hero-shell--compact {
			min-height: auto;
			margin-bottom: 1rem;
			padding-bottom: 2.75rem;
		}

		/* Unused hero sponsor/footer mobile styles kept temporarily for reference.
			.hero-footer-row {
				bottom: 2.5rem;
				display: grid;
				grid-template-columns: repeat(2, minmax(0, 1fr));
				align-items: stretch;
				gap: 0.75rem;
			}

			.hero-footer-row.hero-footer-row--centered {
				grid-template-columns: minmax(0, 1fr);
				justify-content: center;
			}

			.hero-sponsor {
				width: 100%;
				min-width: 0;
				gap: 0.8rem;
				margin-top: 0.5rem;
				padding: 0.85rem 0.9rem;
				border-radius: 1.2rem;
			}

			.hero-footer-row > .hero-sponsor:nth-child(3) {
				grid-column: 1 / -1;
				justify-self: center;
				max-width: 16rem;
				flex-direction: row;
				text-align: left;
			}

			.hero-footer-row.hero-footer-row--centered > .hero-sponsor {
				justify-self: center;
				max-width: 16rem;
				flex-direction: row;
				text-align: left;
			}

			.hero-sponsor .sponsor-logo-chip {
				margin-top: 0.1rem;
			}

			.sponsor-logo-chip {
				height: 3rem;
				width: 3rem;
				border-radius: 1rem;
				font-size: 0.52rem;
			}

			.sponsor-name {
				font-size: 0.72rem;
				letter-spacing: 0.05em;
			}
			*/
	}

	@media (max-width: 460px) {
		.container-custom {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.hero-shell {
			padding-top: 4rem;
			padding-bottom: 10.8rem;
		}

		.hero-shell--compact {
			margin-bottom: 0.85rem;
			padding-bottom: 2.4rem;
		}

		/* Unused hero sponsor/footer narrow-mobile styles kept temporarily for reference.
			.hero-footer-row {
				bottom: 2rem;
				gap: 0.6rem;
			}

			.hero-sponsor {
				gap: 0.6rem;
			}

			.sponsor-logo-chip {
				height: 2.7rem;
				width: 2.7rem;
				font-size: 0.46rem;
				letter-spacing: 0.16em;
			}
			*/
	}
</style>
