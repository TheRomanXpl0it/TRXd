<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import NotFound from '$lib/components/NotFound.svelte';
	import {
		LayoutDashboard,
		Cpu,
		Flag,
		Settings,
		Users as UsersIcon,
		PlusCircle,
		FolderTree,
		Joystick
	} from '@lucide/svelte';
	import { page } from '$app/stores';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const isAdmin = $derived(authState.user?.role === 'Admin');
	const isAuthor = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');
	const ready = $derived(authState.ready);
	const currentPath = $derived($page.url?.pathname ?? '');

	const adminOnlyRoutes = [
		'/admin/instances',
		'/admin/submissions',
		'/admin/users',
		'/admin/teams',
		'/admin/configs'
	];

	const isCurrentRouteAdminOnly = $derived(
		adminOnlyRoutes.some(
			(prefix) => currentPath === prefix || currentPath.startsWith(prefix + '/')
		)
	);

	const isAllowed = $derived(
		isAuthor && (!isCurrentRouteAdminOnly || isAdmin) && !(currentPath.startsWith('/admin/teams') && authState.userMode)
	);

	const sections = $derived(
		[
			{
				title: 'Dashboard',
				items: [{ title: 'Overview', href: '/admin', icon: LayoutDashboard, adminOnly: false }]
			},
			{
				title: 'Authors',
				items: [
					{ title: 'Categories', href: '/admin/categories', icon: FolderTree, adminOnly: false },
					{
						title: 'Manage challenges',
						href: '/admin/challenges',
						icon: Joystick,
						adminOnly: false
					},
					{
						title: 'Create challenge',
						href: '/admin/challenges/create',
						icon: PlusCircle,
						adminOnly: false
					}
				]
			},
			{
				title: 'Admin',
				items: [
					{ title: 'Submissions', href: '/admin/submissions', icon: Flag, adminOnly: true },
					{ title: 'Instances', href: '/admin/instances', icon: Cpu, adminOnly: true },
					{ title: 'Manage users', href: '/admin/users', icon: UsersIcon, adminOnly: true },
					{
						title: 'Manage teams',
						href: '/admin/teams',
						icon: UsersIcon,
						adminOnly: true,
						hideInUserMode: true
					},
					{ title: 'Configuration', href: '/admin/configs', icon: Settings, adminOnly: true }
				]
			}
		]
			.map((section) => ({
				...section,
				items: section.items.filter(
					(item) => (!item.adminOnly || isAdmin) && !(item.hideInUserMode && authState.userMode)
				)
			}))
			.filter((section) => section.items.length > 0)
	);
</script>

<svelte:head>
	{#if ready && !isAllowed}
		<title>404 Not Found</title>
	{/if}
</svelte:head>

{#if !ready}
	<div class="flex h-[70vh] items-center justify-center">
		<div
			class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
		></div>
	</div>
{:else if !isAllowed}
	<NotFound status={404} />
{:else}
	<div class="flex flex-col gap-8 lg:flex-row py-8">
		<!-- Sidebar Navigation -->
		<aside class="w-full shrink-0 lg:w-64">
			<nav class="flex flex-col gap-6 lg:overflow-visible lg:pb-0">
				{#each sections as section}
					<div class="flex flex-col gap-2">
						<h3
							class="text-muted-foreground/50 px-4 text-[10px] font-black uppercase tracking-[0.2em]"
						>
							{section.title}
						</h3>
						<div class="flex flex-col gap-1">
							{#each section.items as item}
								<Button
									variant={currentPath === item.href ? 'secondary' : 'ghost'}
									href={item.href}
									class="justify-start gap-3 px-4 py-2 text-sm font-medium {currentPath ===
									item.href
										? 'bg-primary/10 text-primary hover:bg-primary/15'
										: ''}"
								>
									<item.icon class="h-4 w-4" />
									{item.title}
								</Button>
							{/each}
						</div>
					</div>
				{/each}
			</nav>
		</aside>

		<!-- Main Content -->
		<main class="min-w-0 flex-1">
			{@render children?.()}
		</main>
	</div>
{/if}
