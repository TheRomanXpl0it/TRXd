<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import * as Popover from '$lib/components/ui/popover/index.js';

	type DayCell = {
		key: string;
		date: Date;
		label: number;
		inMonth: boolean;
		isSelected: boolean;
		isToday: boolean;
	};

	const monthFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'long',
		year: 'numeric'
	});

	const displayFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
		weekday: 'short'
	});

	const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(2024, 0, 1 + index);
		return weekdayFormatter.format(date);
	});

	const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
	const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

	let {
		value = $bindable(''),
		placeholder = 'Select date and time',
		invalid = false,
		class: className = ''
	}: {
		value?: string | boolean;
		placeholder?: string;
		invalid?: boolean;
		class?: string;
	} = $props();

	const now = new Date();

	let open = $state(false);
	let visibleMonth = $state(startOfMonth(parseLocalDateTime(String(value ?? '')) ?? now));
	let hour = $state(String(now.getHours()).padStart(2, '0'));
	let minute = $state(String(now.getMinutes()).padStart(2, '0'));
	let syncedValue = $state(String(value ?? ''));

	const selectedDate = $derived.by(() => parseLocalDateTime(String(value ?? '')));
	const displayValue = $derived(selectedDate ? displayFormatter.format(selectedDate) : '');
	const calendarDays = $derived.by(() => buildCalendarDays(visibleMonth, selectedDate));

	$effect(() => {
		const nextValue = String(value ?? '');
		if (nextValue === syncedValue) return;

		syncedValue = nextValue;

		const parsed = parseLocalDateTime(nextValue);
		if (!parsed) return;

		visibleMonth = startOfMonth(parsed);
		hour = String(parsed.getHours()).padStart(2, '0');
		minute = String(parsed.getMinutes()).padStart(2, '0');
	});

	function parseLocalDateTime(raw: string): Date | null {
		const match = String(raw ?? '')
			.trim()
			.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

		if (!match) return null;

		const [, year, month, day, hours, minutes] = match;
		const date = new Date(
			Number(year),
			Number(month) - 1,
			Number(day),
			Number(hours),
			Number(minutes)
		);

		if (Number.isNaN(date.getTime())) return null;

		if (
			date.getFullYear() !== Number(year) ||
			date.getMonth() !== Number(month) - 1 ||
			date.getDate() !== Number(day)
		) {
			return null;
		}

		return date;
	}

	function formatLocalDateTime(date: Date): string {
		const year = String(date.getFullYear());
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function startOfMonth(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	}

	function startOfWeek(date: Date): Date {
		const day = date.getDay();
		const distance = (day + 6) % 7;
		const start = new Date(date);
		start.setDate(date.getDate() - distance);
		start.setHours(0, 0, 0, 0);
		return start;
	}

	function addDays(date: Date, amount: number): Date {
		const next = new Date(date);
		next.setDate(next.getDate() + amount);
		return next;
	}

	function addMonths(date: Date, amount: number): Date {
		return new Date(date.getFullYear(), date.getMonth() + amount, 1);
	}

	function isSameDay(a: Date | null, b: Date | null): boolean {
		if (!a || !b) return false;
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function buildCalendarDays(month: Date, selected: Date | null): DayCell[] {
		const firstVisibleDay = startOfWeek(startOfMonth(month));
		const today = new Date();

		return Array.from({ length: 42 }, (_, index) => {
			const date = addDays(firstVisibleDay, index);
			return {
				key: formatLocalDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0)),
				date,
				label: date.getDate(),
				inMonth: date.getMonth() === month.getMonth(),
				isSelected: isSameDay(date, selected),
				isToday: isSameDay(date, today)
			};
		});
	}

	function updateValue(date: Date) {
		const next = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			Number(hour),
			Number(minute)
		);
		value = formatLocalDateTime(next);
	}

	function selectDate(date: Date) {
		visibleMonth = startOfMonth(date);
		updateValue(date);
	}

	function setHour(nextHour: string) {
		hour = nextHour;
		if (selectedDate) updateValue(selectedDate);
	}

	function setMinute(nextMinute: string) {
		minute = nextMinute;
		if (selectedDate) updateValue(selectedDate);
	}

	function setNow() {
		const current = new Date();
		hour = String(current.getHours()).padStart(2, '0');
		minute = String(current.getMinutes()).padStart(2, '0');
		visibleMonth = startOfMonth(current);
		value = formatLocalDateTime(current);
	}

	function clearValue() {
		value = '';
	}
</script>

<Popover.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) return;
		visibleMonth = startOfMonth(selectedDate ?? new Date());
	}}
>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class={cn(
					'h-9 w-full justify-between font-normal',
					!selectedDate && 'text-muted-foreground',
					className
				)}
				aria-invalid={invalid}
			>
				<span class="truncate">{displayValue || placeholder}</span>
				<CalendarDays class="size-4 opacity-60" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-[22rem] max-w-[calc(100vw-2rem)] space-y-4 p-3" align="start">
		<div class="flex items-center justify-between gap-2">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onclick={() => (visibleMonth = addMonths(visibleMonth, -1))}
				aria-label="Previous month"
			>
				<ChevronLeft class="size-4" />
			</Button>

			<div class="text-sm font-semibold">{monthFormatter.format(visibleMonth)}</div>

			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onclick={() => (visibleMonth = addMonths(visibleMonth, 1))}
				aria-label="Next month"
			>
				<ChevronRight class="size-4" />
			</Button>
		</div>

		<div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
			{#each weekdayLabels as weekday}
				<div class="py-1">{weekday}</div>
			{/each}
		</div>

		<div class="grid grid-cols-7 gap-1">
			{#each calendarDays as day (day.key)}
				<button
					type="button"
					class={cn(
						'inline-flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors outline-none',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						day.isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
						!day.isSelected && day.inMonth && 'hover:bg-accent hover:text-accent-foreground',
						!day.isSelected &&
							!day.inMonth &&
							'text-muted-foreground/50 hover:bg-accent/50 hover:text-foreground',
						day.isToday && !day.isSelected && 'ring-primary/30 ring-1'
					)}
					onclick={() => selectDate(day.date)}
					aria-pressed={day.isSelected}
					aria-label={displayFormatter.format(
						new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), Number(hour), Number(minute))
					)}
				>
					{day.label}
				</button>
			{/each}
		</div>

		<div class="border-t pt-3">
			<div class="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
				<Clock3 class="size-3.5" />
				Time
			</div>

			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
				<select
					class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-sm font-medium outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
					value={hour}
					onchange={(event) => setHour((event.currentTarget as HTMLSelectElement).value)}
					aria-label="Hour"
				>
					{#each hours as option}
						<option value={option}>{option}</option>
					{/each}
				</select>

				<div class="text-sm font-semibold text-muted-foreground">:</div>

				<select
					class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-sm font-medium outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
					value={minute}
					onchange={(event) => setMinute((event.currentTarget as HTMLSelectElement).value)}
					aria-label="Minute"
				>
					{#each minutes as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex items-center justify-between gap-2 border-t pt-3">
			<Button type="button" variant="ghost" size="sm" onclick={setNow}>Now</Button>

			<div class="flex items-center gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={clearValue} disabled={!value}>
					Clear
				</Button>
				<Button type="button" size="sm" onclick={() => (open = false)}>Done</Button>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
