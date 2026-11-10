<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { Component, innerProps = $bindable({}) }: {
		Component: any;
		innerProps?: any;
	} = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: Infinity
			}
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Tooltip.Provider delayDuration={0}>
		<Component {...innerProps} />
	</Tooltip.Provider>
</QueryClientProvider>
