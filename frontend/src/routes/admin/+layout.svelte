<script lang="ts">
	import { authState } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { 
		LayoutDashboard, 
		Cpu, 
		Flag, 
		Settings, 
		Users as UsersIcon,
		PlusCircle,
		ShieldAlert,
		FolderTree,
		Joystick
	} from '@lucide/svelte';
	import { page } from '$app/state';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const isAdmin = $derived(authState.user?.role === 'Admin');
	const isAuthor = $derived(authState.user?.role === 'Admin' || authState.user?.role === 'Author');
	const ready = $derived(authState.ready);

	onMount(() => {
		if (ready && !isAuthor) {
			goto('/');
		}
	});

	const sections = $derived([
		{
			title: 'Dashboard',
			items: [
				{ title: 'Overview', href: '/admin', icon: LayoutDashboard, adminOnly: false }
			]
		},
		{
			title: 'Authors',
			items: [
				{ title: 'Categories', href: '/admin/categories', icon: FolderTree, adminOnly: false },
				{ title: 'Manage Challenges', href: '/admin/challenges', icon: Joystick, adminOnly: false },
				{ title: 'Create Challenge', href: '/admin/challenges/create', icon: PlusCircle, adminOnly: false }
			]
		},
		{
			title: 'Admin',
			items: [
				{ title: 'Instances', href: '/admin/instances', icon: Cpu, adminOnly: true },
				{ title: 'Submissions', href: '/admin/submissions', icon: Flag, adminOnly: true },
				{ title: 'Users Control', href: '/admin/users', icon: UsersIcon, adminOnly: true },
				{
					title: 'Teams Control',
					href: '/admin/teams',
					icon: UsersIcon,
					adminOnly: true,
					hideInUserMode: true
				},
				{ title: 'Configs', href: '/admin/configs', icon: Settings, adminOnly: true }
			]
		}
	].map(section => ({
		...section,
		items: section.items.filter(
			(item) => (!item.adminOnly || isAdmin) && !(item.hideInUserMode && authState.userMode)
		)
	})).filter(section => section.items.length > 0));

	const currentPath = $derived(page.url.pathname);
</script>

{#if !ready}
	<div class="flex h-[70vh] items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
	</div>
{:else if !isAuthor}
	<div class="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
		<ShieldAlert class="h-16 w-16 text-destructive" />
		<h1 class="text-3xl font-bold">Access Denied</h1>
		<p class="text-muted-foreground">You do not have permission to access the admin area.</p>
		<Button href="/">Back to Home</Button>
	</div>
{:else}
	<div class="flex flex-col gap-8 lg:flex-row">
		<!-- Sidebar Navigation -->
		<aside class="w-full shrink-0 lg:w-64">
			<nav class="flex flex-col gap-6 lg:overflow-visible lg:pb-0">
				{#each sections as section}
					<div class="flex flex-col gap-2">
						<h3 class="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
							{section.title}
						</h3>
						<div class="flex flex-col gap-1">
							{#each section.items as item}
								<Button
									variant={currentPath === item.href ? 'secondary' : 'ghost'}
									href={item.href}
									class="justify-start gap-3 px-4 py-2 text-sm font-medium {currentPath === item.href ? 'bg-primary/10 text-primary hover:bg-primary/15' : ''}"
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
		<main class="flex-1 min-w-0">
			{@render children?.()}
		</main>
	</div>
{/if}
