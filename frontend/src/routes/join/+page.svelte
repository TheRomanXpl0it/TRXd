<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { loadUser } from '$lib/stores/auth';
	import { joinTeamWithToken } from '$lib/team';

	let { data } = $props();

	onMount(async () => {
		try {
			await joinTeamWithToken(data.token);
			toast.success('Joined team successfully!');
			await loadUser(); // Refresh user state to see the new team
			goto('/team');
		} catch (err: any) {
			console.error('Failed to join team:', err);
			toast.error(err?.message ?? 'Failed to join team. The link might be invalid or expired.');
			goto('/teams');
		}
	});
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
	<Spinner class="mb-4 h-12 w-12 text-primary" />
	<h1 class="text-3xl font-black tracking-tight">Processing Invite...</h1>
	<p class="text-muted-foreground mt-2 max-w-sm">
		Please wait while we validate your invite and add you to the team.
	</p>
</div>
