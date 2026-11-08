<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import NotFound from '$lib/components/NotFound.svelte';
	import { goto } from '$app/navigation';
	import {
		LayoutDashboard,
		Cpu,
		Flag,
		Settings,
		Users as UsersIcon,
		PlusCircle,
		FolderTree,
		Joystick,
		ChevronDown
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

	const allItems = $derived(sections.flatMap((s) => s.items));
	const activeItem = $derived(
		allItems.find((item) => currentPath === item.href) ??
		allItems.find((item) => item.href !== '/admin' && currentPath.startsWith(item.href)) ??
		allItems[0]
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
	<div class="flex flex-col gap-6 lg:gap-8 lg:flex-row py-6 sm:py-8">
		<!-- Mobile Dropdown Navigation (< lg) -->
		<div class="w-full lg:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							{...props}
							class="w-full justify-between gap-3 px-4 py-2.5 text-sm font-medium border-input bg-background dark:bg-input/30 shadow-xs"
						>
							<div class="flex items-center gap-2.5 truncate">
								{#if activeItem}
									<activeItem.icon class="h-4 w-4 shrink-0 text-primary" />
									<span class="truncate font-semibold">{activeItem.title}</span>
								{:else}
									<LayoutDashboard class="h-4 w-4 shrink-0 text-primary" />
									<span class="truncate font-semibold">Admin navigation</span>
								{/if}
							</div>
							<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-[280px] p-2" align="start">
					{#each sections as section, sIdx}
						{#if sIdx > 0}
							<DropdownMenu.Separator class="my-1.5" />
						{/if}
						<DropdownMenu.Group>
							<DropdownMenu.GroupHeading class="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
								{section.title}
							</DropdownMenu.GroupHeading>
							{#each section.items as item}
								<DropdownMenu.Item
									onclick={() => goto(item.href)}
									class="cursor-pointer gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium {currentPath === item.href ? 'bg-primary/10 text-primary font-semibold' : ''}"
								>
									<item.icon class="h-4 w-4" />
									<span>{item.title}</span>
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Group>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Desktop Sidebar Navigation (lg:) -->
		<aside class="hidden w-full shrink-0 lg:block lg:w-64">
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
