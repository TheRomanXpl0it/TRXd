<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
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

	async function loadStats() {
		if (statsLoading || statsData) return;

		statsLoading = true;
		try {
			const [stats, instances] = await Promise.all([
				getAdminStats(),
				getInstances().catch(() => [])
			]);
			statsData = stats;
			instancesData = Array.isArray(instances) ? instances : [];
		} catch {
			statsData = null;
			instancesData = null;
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
			href: '/admin/challenges',
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
			href: '/admin/users',
			value: statsData ? `${statsData.total_players}` : '…',
			sub: statsData ? `${statsData.total_users} total accounts` : 'loading…',
			icon: UsersIcon,
			color: 'text-green-500',
			bgColor: 'bg-green-500/10'
		},
		{
			title: 'Submissions',
			href: '/admin/submissions',
			value: statsData ? `${statsData.total_correct_submissions}` : '…',
			sub: statsData ? `${statsData.total_submissions} total attempts` : 'loading…',
			icon: Activity,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500/10'
		},
		{
			title: 'Instances',
			href: '/admin/instances',
			value: instancesData !== null ? `${instancesData.length}` : '…',
			sub: instancesData !== null
				? `${instancesData.length === 1 ? '1 active instance' : `${instancesData.length} active instances`}`
				: 'loading…',
			icon: Cpu,
			color: 'text-amber-500',
			bgColor: 'bg-amber-500/10'
		}
	]);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Admin dashboard</h1>
		<p class="text-muted-foreground mt-1">
			Welcome back, <span class="text-foreground font-medium">{user?.name}</span>. You are logged in
			as <Badge variant="secondary" class="ml-1 capitalize">{user?.role}</Badge>
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<a href={stat.href} class="no-underline text-inherit block transition-transform hover:-translate-y-0.5">
				<Card.Root class="h-full hover:border-primary/50 transition-colors">
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
			</a>
		{/each}
	</div>
</div>
