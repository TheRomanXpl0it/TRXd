<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import ErrorMessage from '$lib/components/ui/error-message.svelte';
	import EmptyState from '$lib/components/ui/empty-state.svelte';
	import GeneratedAvatar from '$lib/components/ui/avatar/generated-avatar.svelte';
	import CountryFlag from '$lib/components/ui/country-flag.svelte';
	import { getCountryByIso3 } from '$lib/utils/countries';
	import { truncateText } from '$lib/utils/formatting';
	import { Globe } from '@lucide/svelte';

	let {
		rows = [],
		loading = false,
		error = null,
		errorTitle,
		entityLabel,
		hrefPrefix,
		showRole = false,
		emptyIcon,
		emptyTitle,
		emptyDescription,
		count = 0,
		perPage = 20,
		currentPage = 1,
		onPageChange
	}: {
		rows: any[];
		loading: boolean;
		error: string | null;
		errorTitle: string;
		entityLabel: string;
		hrefPrefix: string;
		showRole?: boolean;
		emptyIcon: any;
		emptyTitle: string;
		emptyDescription: string;
		count: number;
		perPage: number;
		currentPage: number;
		onPageChange: (page: number) => void;
	} = $props();

	function getRoleBadgeVariant(role: string): string {
		const r = role?.toLowerCase() || 'player';
		if (r === 'admin') {
			return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
		}
		if (r === 'author') {
			return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
		}
		if (r === 'spectator') {
			return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
		}
		return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
	}
</script>

<div class="mx-auto max-w-5xl space-y-6 py-8">
	{#if error}
		<ErrorMessage title={errorTitle} message={error} />
	{:else}
		<Card.Root id="directory-table" class="overflow-hidden border-0 shadow-sm">
			<Card.Content class="p-0">
				<div class="relative mx-4 overflow-auto sm:mx-6">
					<Table.Root>
						<Table.Header class="bg-transparent [&_tr]:border-b-0">
							<Table.Row class="hover:bg-transparent">
								<Table.Head
									class="text-muted-foreground/70 w-[300px] bg-transparent text-[10px] font-bold uppercase tracking-wider"
								>
									{entityLabel}
								</Table.Head>
								<Table.Head
									class="text-muted-foreground/70 w-[200px] bg-transparent text-[10px] font-bold uppercase tracking-wider"
								>
									Country
								</Table.Head>
								{#if showRole}
									<Table.Head
										class="text-muted-foreground/70 bg-transparent text-[10px] font-bold uppercase tracking-wider"
									>
										Role
									</Table.Head>
								{/if}
								<Table.Head
									class="text-muted-foreground/70 bg-transparent text-right text-[10px] font-bold uppercase tracking-wider"
								>
									Score
								</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if loading && rows.length === 0}
								{#each Array(5) as _}
									<Table.Row>
										<Table.Cell><Skeleton class="h-4 w-[150px]" /></Table.Cell>
										<Table.Cell><Skeleton class="h-5 w-[100px]" /></Table.Cell>
										{#if showRole}
											<Table.Cell><Skeleton class="h-6 w-[80px] rounded-full" /></Table.Cell>
										{/if}
										<Table.Cell class="text-right">
											<Skeleton class="ml-auto h-4 w-[50px]" />
										</Table.Cell>
									</Table.Row>
								{/each}
							{:else if rows.length === 0}
								<Table.Row>
									<Table.Cell colspan={showRole ? 4 : 3} class="h-[300px] text-center">
										<EmptyState
											icon={emptyIcon}
											title={emptyTitle}
											description={emptyDescription}
										/>
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each rows as row (row.id)}
									<Table.Row class="hover:bg-muted/50 border-b-0 transition-colors">
										<Table.Cell class="py-3">
											<a
												href={`${hrefPrefix}${row.id}`}
												class="decoration-primary/50 flex items-center gap-3 underline-offset-4 hover:underline"
											>
												<div
													class="border-border h-8 w-8 shrink-0 overflow-hidden rounded-full border"
												>
													<GeneratedAvatar seed={row.name} size={32} class="h-full w-full" />
												</div>
												<span class="text-foreground font-semibold">
													{truncateText(row.name)}
												</span>
											</a>
										</Table.Cell>

										<Table.Cell>
											{#if row.country}
												{@const country = getCountryByIso3(row.country)}
												<div class="flex items-center gap-2">
													<div
														class="bg-background relative flex h-6 w-8 shrink-0 items-center justify-center overflow-hidden rounded border shadow-sm"
													>
														{#if country?.iso2}
															<CountryFlag
																country={country.iso2}
																width={32}
																height={32}
																class="h-full w-full object-cover"
															/>
														{:else}
															<Globe class="text-muted-foreground h-4 w-4" />
														{/if}
													</div>
													<span class="text-foreground text-sm font-medium">
														{country?.label ?? row.country}
													</span>
												</div>
											{:else}
												<span class="text-muted-foreground text-sm italic">Not specified</span>
											{/if}
										</Table.Cell>

										{#if showRole}
											<Table.Cell>
												<span
													class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeVariant(row.role)}`}
												>
													{row.role ?? 'Player'}
												</span>
											</Table.Cell>
										{/if}

										<Table.Cell class="text-right">
											<div
												class="font-mono text-sm font-medium tabular-nums leading-none tracking-tight"
											>
												{row.score?.toLocaleString() ?? 0} pts
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		{#if count > perPage}
			<Pagination.Root
				{count}
				{perPage}
				page={currentPage}
				{onPageChange}
				siblingCount={1}
				class="mt-4"
			>
				{#snippet children({ pages, currentPage: pageNum })}
					<div class="flex w-full justify-center overflow-x-auto py-4" id="pagination-controls">
						<Pagination.Content class="gap-4">
							<Pagination.Item class="mx-2">
								<Pagination.PrevButton class="h-9 w-9 cursor-pointer" />
							</Pagination.Item>

							{#each pages as page (page.key)}
								{#if page.type === 'ellipsis'}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link
											{page}
											isActive={pageNum === page.value}
											class="data-[selected]:bg-foreground data-[selected]:text-background h-9 w-9 cursor-pointer transition-all data-[selected]:shadow-md"
										>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}

							<Pagination.Item class="mx-2">
								<Pagination.NextButton class="h-9 w-9 cursor-pointer" />
							</Pagination.Item>
						</Pagination.Content>
					</div>
				{/snippet}
			</Pagination.Root>
		{/if}
	{/if}
</div>
