<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Joystick,
		ShieldHalf,
		Trophy,
		LogOut,
		User,
		Settings,
		Users,
		LayoutDashboard,
		ChevronDown,
		Menu
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import { siteContent } from '$lib/site-content';
	import { authState } from '$lib/stores/auth';

	interface Props {
		user: any;
		userMode: boolean;
	}

	let { user, userMode }: Props = $props();

	// Navigation items
	const navItems = [
		{ title: 'Challenges', url: '/challenges', icon: Joystick },
		{ title: 'Scoreboard', url: '/scoreboard', icon: Trophy },
		{ title: 'Users', url: '/users', icon: Users, authOnly: true },
		{ title: 'Teams', url: '/teams', icon: ShieldHalf, authOnly: true, teamModeOnly: true }
	];

	// Role checks
	const isAdmin = $derived(user?.role === 'Admin');
	const isAuthor = $derived(user?.role === 'Admin' || user?.role === 'Author');

	const filteredNavItems = $derived(
		navItems.filter((item) => {
			if (item.authOnly && !user) return false;
			if (item.teamModeOnly && userMode) return false;
			return true;
		})
	);
</script>

<nav
	class="bg-background/80 border-muted/50 dark:border-muted/20 sticky top-0 z-50 w-full border-b backdrop-blur-xl"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-20 items-center justify-between">
			<!-- Left side: Logo + Mobile Toggle + Links -->
			<div class="flex items-center gap-4 md:gap-10">
				<!-- Mobile Menu Toggle -->
				<div class="md:hidden">
					<Sheet.Root>
						<Sheet.Trigger>
							{#snippet child({ props })}
								<Button variant="ghost" size="icon" {...props} class="h-10 w-10">
									<Menu class="h-6 w-6" />
								</Button>
							{/snippet}
						</Sheet.Trigger>
						<Sheet.Content
							side="left"
							class="border-muted/50 w-[300px] border-r p-0 backdrop-blur-2xl"
						>
							<div class="bg-background/80 flex h-full flex-col">
								<div class="border-muted/20 border-b px-6 py-8">
									<div class="flex items-center gap-4">
										<img src="/trx.svg" alt={$siteContent.brand.logoAlt} class="h-10 w-10" />
										<span class="text-2xl font-black tracking-tighter"
											>{$siteContent.brand.shortName}</span
										>
									</div>
								</div>

								<div class="flex-1 space-y-1 px-3 py-6">
									{#each filteredNavItems as item}
										<Button
											variant="ghost"
											href={item.url}
											class="w-full justify-start gap-4 rounded-xl px-4 py-6 text-base font-bold transition-all"
										>
											<item.icon class="h-5 w-5" />
											{item.title}
										</Button>
									{/each}
								</div>

								<div
									class="border-muted/20 text-muted-foreground/40 border-t p-6 text-[10px] font-black uppercase tracking-widest"
								>
									{$siteContent.brand.footerText}
								</div>
							</div>
						</Sheet.Content>
					</Sheet.Root>
				</div>

				<a href="/home" class="flex items-center gap-4">
					<div class="relative">
						<img
							src="/trx.svg"
							alt={$siteContent.brand.logoAlt}
							class="relative h-12 w-12 drop-shadow-sm"
						/>
					</div>
						<span
							class="text-foreground hidden shrink-0 pr-px text-3xl font-black leading-[1.05] tracking-tight truncate sm:block md:max-w-[100px] lg:max-w-none"
							>{$siteContent.brand.shortName}</span
						>
					</a>

				<div class="hidden items-center gap-1 md:flex">
					{#each filteredNavItems as item}
						<Button
							variant="ghost"
							href={item.url}
							class="group relative flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-all"
						>
							<item.icon class="h-4.5 w-4.5" />
							{item.title}
						</Button>
					{/each}
				</div>

				<!-- Mobile Quick Links -->
				<div class="flex items-center gap-1 md:hidden">
					{#each filteredNavItems.slice(0, 2) as item}
						<Button
							variant="ghost"
							size="icon"
							href={item.url}
							class="h-10 w-10 rounded-xl transition-all"
							title={item.title}
						>
							<item.icon class="h-5 w-5" />
						</Button>
					{/each}
				</div>
			</div>

			<!-- Right side: User Dropdown / Sign In -->
			<div class="flex items-center gap-4">
				{#if user}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									{...props}
									class="group relative flex h-14 w-auto items-center justify-end rounded-2xl border border-transparent px-3 transition-all active:scale-[0.98] sm:h-20 sm:w-60 sm:justify-between sm:px-5"
								>
									<div class="flex items-center gap-2 sm:gap-4">
										<div
											class="ring-muted/30 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-lg ring-1"
										>
											{#if user.image || user.profileImage}
												<img
													src={user.image || user.profileImage}
													alt={user.name}
													class="h-full w-full object-cover"
												/>
											{:else}
												<GeneratedAvatar
													seed={user.name ?? 'user'}
													size={40}
													class="block size-10"
												/>
											{/if}
										</div>
										<div class="hidden flex-col items-start text-left sm:flex">
											<span
												class="max-w-[120px] truncate text-base font-bold leading-none tracking-tight"
												>{user.name}</span
											>
										</div>
									</div>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							align="end"
							class="border-muted/50 animate-in fade-in zoom-in-95 w-60 p-2 shadow-2xl backdrop-blur-2xl duration-200"
						>
							<div class="space-y-0.5">
								{#if !userMode && user.team_id}
									<DropdownMenu.Item
										onclick={() => goto('/team')}
										class="cursor-pointer gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
									>
										<ShieldHalf class="h-4.5 w-4.5 opacity-70" />
										<span>My Team</span>
									</DropdownMenu.Item>
								{/if}

								<DropdownMenu.Item
									onclick={() => goto('/account')}
									class="cursor-pointer gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
								>
									<User class="h-4.5 w-4.5 opacity-70" />
									<span>My Profile</span>
								</DropdownMenu.Item>

								<DropdownMenu.Item
									onclick={() => goto('/settings')}
									class="cursor-pointer gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
								>
									<Settings class="h-4.5 w-4.5 opacity-70" />
									<span>Settings</span>
								</DropdownMenu.Item>

								{#if isAuthor}
									<DropdownMenu.Item
										onclick={() => goto('/admin')}
										class="cursor-pointer gap-3 rounded-md px-3 py-2.5 text-sm font-semibold opacity-80 hover:opacity-100"
									>
										<LayoutDashboard class="h-4.5 w-4.5" />
										<span>Admin Dashboard</span>
									</DropdownMenu.Item>
								{/if}
							</div>

							<DropdownMenu.Separator class="mx-1.5 my-1" />
							<DropdownMenu.Item
								onclick={() => goto('/signOut')}
								class="text-destructive cursor-pointer gap-3 rounded-md px-3 py-2.5 text-sm font-bold"
							>
								<LogOut class="h-4.5 w-4.5" />
								<span>Sign Out</span>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button
						href="/signIn"
						variant="default"
						size="lg"
						class="shadow-primary/20 px-8 font-bold shadow-lg transition-all"
					>
						Sign In
					</Button>
				{/if}
			</div>
		</div>
	</div>
</nav>
