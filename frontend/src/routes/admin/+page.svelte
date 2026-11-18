<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { siteContent } from '$lib/site-content';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ErrorMessage from '$lib/components/ui/error-message.svelte';
	import {
		Cpu,
		Flag,
		Users as UsersIcon,
		Activity
	} from '@lucide/svelte';
	import { getAdminStats } from '$lib/challenges';
	import { getInstances } from '$lib/instances';

	const user = $derived(authState.user);
	const ready = $derived(authState.ready);
	const isAdmin = $derived(user?.role === 'Admin');
	const canViewStats = $derived(user?.role === 'Admin' || user?.role === 'Author');

	let statsData = $state<any>(null);
	let instancesData = $state<any[] | null>(null);
	let statsLoading = $state(false);
	let statsError = $state<string | null>(null);

	async function loadStats(force = false) {
		if (statsLoading || (!force && statsData)) return;

		statsLoading = true;
		statsError = null;
		try {
			const [stats, instances] = await Promise.all([
				getAdminStats(),
				getInstances().catch(() => [])
			]);
			statsData = stats;
			instancesData = Array.isArray(instances) ? instances : [];
		} catch (err: any) {
			statsData = null;
			instancesData = null;
			statsError = err?.message ?? 'Failed to load dashboard stats.';
		} finally {
			statsLoading = false;
		}
	}

	$effect(() => {
		if (!ready || !canViewStats) return;
		void loadStats();
	});

	const fallbackValue = $derived(statsError ? '—' : '…');
	const fallbackSub = $derived(statsError ? 'unavailable' : 'loading…');

	const stats = $derived([
		{
			title: 'Challenges',
			href: '/admin/challenges',
			adminOnly: false,
			value: statsData
				? `${statsData.total_released_challenges}/${statsData.total_challenges}`
				: fallbackValue,
			sub: statsData ? 'released / total' : fallbackSub,
			icon: Flag,
			color: 'text-blue-500',
			bgColor: 'bg-blue-500/10'
		},
		{
			title: 'Users',
			href: '/admin/users',
			adminOnly: true,
			value: statsData ? `${statsData.total_players}` : fallbackValue,
			sub: statsData ? `${statsData.total_users} total accounts` : fallbackSub,
			icon: UsersIcon,
			color: 'text-green-500',
			bgColor: 'bg-green-500/10'
		},
		{
			title: 'Submissions',
			href: '/admin/submissions',
			adminOnly: true,
			value: statsData ? `${statsData.total_correct_submissions}` : fallbackValue,
			sub: statsData ? `${statsData.total_submissions} total attempts` : fallbackSub,
			icon: Activity,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500/10'
		},
		{
			title: 'Instances',
			href: '/admin/instances',
			adminOnly: true,
			value: instancesData !== null ? `${instancesData.length}` : fallbackValue,
			sub: instancesData !== null
				? `${instancesData.length === 1 ? '1 active instance' : `${instancesData.length} active instances`}`
				: fallbackSub,
			icon: Cpu,
			color: 'text-amber-500',
			bgColor: 'bg-amber-500/10'
		}
	]);
</script>

<svelte:head>
	<title>Admin dashboard | {$siteContent.brand.adminTitleSuffix}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Admin dashboard</h1>
		<p class="text-muted-foreground mt-1">
			Welcome back, <span class="text-foreground font-medium">{user?.name}</span>. You are logged in
			as <Badge variant="secondary" class="ml-1 capitalize">{user?.role}</Badge>
		</p>
	</div>

	{#if statsError}
		<div class="space-y-3">
			<ErrorMessage title="Error loading dashboard stats" message={statsError} />
			<Button variant="outline" size="sm" onclick={() => loadStats(true)} disabled={statsLoading}>
				Retry
			</Button>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			{@const isLink = !stat.adminOnly || isAdmin}
			<svelte:element
				this={isLink ? 'a' : 'div'}
				href={isLink ? stat.href : undefined}
				class="no-underline text-inherit block transition-transform {isLink ? 'hover:-translate-y-0.5' : ''}"
			>
				<Card.Root class="h-full {isLink ? 'hover:border-primary/50 transition-colors' : ''}">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{stat.title}</Card.Title>
						<div class="{stat.bgColor} {stat.color} rounded-md p-2">
							<stat.icon class="h-4 w-4" />
						</div>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stat.value}</div>
						<p class="text-muted-foreground mt-1 text-xs">{stat.sub ?? 'Total count in database'}</p>
					</Card.Content>
				</Card.Root>
			</svelte:element>
		{/each}
	</div>
</div>
