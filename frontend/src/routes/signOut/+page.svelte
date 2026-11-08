<script lang="ts">
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { logout } from '$lib/auth';
	import { clearUser } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	onMount(() => {
		(async () => {
			try {
				await logout();
				clearUser();
			} catch (e) {
				console.error('Logout failed', e);
			} finally {
				window.location.href = '/';
			}
		})();
	});
</script>

<div class="flex h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
	<Spinner />
	<p class="text-sm font-medium">Signing out...</p>
</div>
