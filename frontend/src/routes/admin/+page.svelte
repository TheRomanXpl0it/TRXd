<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		LayoutDashboard,
		Cpu,
		Flag,
		Settings,
		Users as UsersIcon,
		PlusCircle,
		Activity
	} from '@lucide/svelte';
	import { getAdminStats } from '$lib/challenges';

	const user = $derived(authState.user);
	const ready = $derived(authState.ready);
	const isAdmin = $derived(user?.role === 'Admin');
	const canViewStats = $derived(user?.role === 'Admin' || user?.role === 'Author');

	let statsData = $state<any>(null);
	let statsLoading = $state(false);

	async function loadStats() {
		if (statsLoading || statsData) return;

		statsLoading = true;
		try {
			statsData = await getAdminStats();
		} catch {
			statsData = null;
		} finally {
			statsLoading = false;
		}
	}

	$effect(() => {
		if (!ready || !canViewStats) return;
		void loadStats();
	});

	const stats = $derived([
		{
			title: 'Challenges',
			value: statsData
				? `${statsData.total_released_challenges}/${statsData.total_challenges}`
				: '…',
			sub: statsData ? 'released / total' : 'loading…',
			icon: Flag,
			color: 'text-blue-500',
			bgColor: 'bg-blue-500/10'
		},
		{
			title: 'Users',
			value: statsData ? `${statsData.total_players}` : '…',
			sub: statsData ? `${statsData.total_users} total accounts` : 'loading…',
			icon: UsersIcon,
			color: 'text-green-500',
			bgColor: 'bg-green-500/10'
		},
		{
			title: 'Submissions',
			value: statsData ? `${statsData.total_correct_submissions}` : '…',
			sub: statsData ? `${statsData.total_submissions} total attempts` : 'loading…',
			icon: Activity,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500/10'
		}
	]);

	const quickLinks = $derived(
		[
			{
				title: 'Instances',
				href: '/admin/instances',
				icon: Cpu,
				desc: 'Manage containerized challenges',
				adminOnly: true
			},
			{
				title: 'Submissions',
				href: '/admin/submissions',
				icon: Flag,
				desc: 'Review recent flag submits',
				adminOnly: true
			},
			{
				title: 'Users',
				href: '/admin/users',
				icon: UsersIcon,
				desc: authState.userMode
					? 'Manage team-backed user accounts and passwords'
					: 'Manage user accounts and passwords',
				adminOnly: true
			},
			{
				title: 'Teams Control',
				href: '/admin/teams',
				icon: UsersIcon,
				desc: 'Manage teams and regenerate join passwords',
				adminOnly: true,
				hideInUserMode: true
			},
			{
				title: 'Create Challenge',
				href: '/admin/challenges/create',
				icon: PlusCircle,
				desc: 'Unified creation flow',
				adminOnly: false
			}
		].filter(
			(link) => (!link.adminOnly || isAdmin) && !(link.hideInUserMode && authState.userMode)
		)
	);
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
		<p class="text-muted-foreground mt-1">
			Welcome back, <span class="text-foreground font-medium">{user?.name}</span>. You are logged in
			as <Badge variant="secondary" class="ml-1 capitalize">{user?.role}</Badge>
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		{#each stats as stat}
			<Card.Root>
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
		{/each}
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each quickLinks as link}
			<a href={link.href} class="group">
				<Card.Root class="hover:border-primary/50 transition-shadow hover:shadow-md">
					<Card.Header class="flex flex-row items-start gap-4 space-y-0">
						<div
							class="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground rounded-lg p-3 transition-colors"
						>
							<link.icon class="h-6 w-6" />
						</div>
						<div class="space-y-1">
							<Card.Title class="group-hover:text-primary text-lg transition-colors"
								>{link.title}</Card.Title
							>
							<Card.Description>{link.desc}</Card.Description>
						</div>
					</Card.Header>
				</Card.Root>
			</a>
		{/each}
	</div>
</div>
