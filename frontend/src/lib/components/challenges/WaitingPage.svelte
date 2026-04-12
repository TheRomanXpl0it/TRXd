<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Code, Database, Lock, Shield } from '@lucide/svelte';

	let { startTime, title = 'Starting soon' } = $props<{
		startTime: string | null;
		title?: string;
	}>();

	let timeLeft = $state({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		total: 0
	});

	let interval: any;
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;

	function updateCountdown() {
		if (!startTime) return;

		const start = new Date(startTime).getTime();
		const now = new Date().getTime();
		const diff = start - now;

		if (diff <= 0) {
			timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
			if (interval) clearInterval(interval);
			if (typeof window !== 'undefined') window.location.reload();
			return;
		}

		timeLeft = {
			days: Math.floor(diff / (1000 * 60 * 60 * 24)),
			hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
			minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
			seconds: Math.floor((diff % (1000 * 60)) / 1000),
			total: diff
		};
	}

	// Game of Life Logic (from homepage.html)
	const TARGET_CELL_SIZE = 16;
	const FPS = 8;
	const MAX_AGE = 14;

	let COLS = 0;
	let ROWS = 0;
	let grid: any[] = [];
	let recentActivity: number[] = [];
	let lastTime = 0;
	let animationFrame: number;

	const PATTERNS = [
		{
			name: 'glider',
			weight: 14,
			cells: [
				[0, 1, 0],
				[0, 0, 1],
				[1, 1, 1]
			]
		},
		{
			name: 'lwss',
			weight: 8,
			cells: [
				[0, 1, 1, 1, 1],
				[1, 0, 0, 0, 1],
				[0, 0, 0, 0, 1],
				[1, 0, 0, 1, 0]
			]
		},
		{
			name: 'mwss',
			weight: 5,
			cells: [
				[0, 0, 1, 1, 1, 1],
				[1, 1, 0, 0, 0, 1],
				[0, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 1, 0],
				[0, 1, 0, 0, 0, 0]
			]
		},
		{
			name: 'pulsar',
			weight: 2,
			cells: [
				[0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]
			]
		},
		{
			name: 'gosper',
			weight: 1,
			cells: [
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 1, 1
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 1, 1
				],
				[
					1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				],
				[
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0
				]
			]
		}
	];

	function getThemeColors() {
		const isDark = document.documentElement.classList.contains('dark');
		if (isDark) {
			return {
				alive: '#14b8a6', // teal-500
				aliveLight: '#2dd4bf', // teal-400
				aliveDark: '#0f766e' // teal-700
			};
		}
		return {
			alive: '#10b981', // emerald-500
			aliveLight: '#34d399', // emerald-400
			aliveDark: '#065f46' // emerald-700
		};
	}

	function createCell(state = 0, age = 0, glow = 0) {
		return { state, age, glow };
	}

	function randomCell(probability = 0.035) {
		const alive = Math.random() < probability ? 1 : 0;
		return createCell(alive, 0, alive ? 1 : 0);
	}

	function rotatePattern(pattern: number[][]) {
		return pattern[0].map((_, x) => pattern.map((row) => row[x]).reverse());
	}

	function transformPattern(pattern: number[][]) {
		let p = pattern;
		const rotations = Math.floor(Math.random() * 4);
		for (let i = 0; i < rotations; i++) p = rotatePattern(p);
		if (Math.random() > 0.5) p = p.map((row) => [...row].reverse());
		return p;
	}

	function pickPattern() {
		const total = PATTERNS.reduce((sum, p) => sum + p.weight, 0);
		let r = Math.random() * total;

		for (const pattern of PATTERNS) {
			r -= pattern.weight;
			if (r <= 0) return pattern;
		}

		return PATTERNS[0];
	}

	function resizeCanvas() {
		if (!canvas) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		canvas.style.width = vw + 'px';
		canvas.style.height = vh + 'px';
		canvas.width = Math.floor(vw * dpr);
		canvas.height = Math.floor(vh * dpr);

		if (!ctx) ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);

		const newCols = Math.ceil(vw / TARGET_CELL_SIZE);
		const newRows = Math.ceil(vh / TARGET_CELL_SIZE);

		if (newCols === COLS && newRows === ROWS && grid.length) return;

		COLS = newCols;
		ROWS = newRows;

		grid = Array.from({ length: ROWS }, () =>
			Array.from({ length: COLS }, () => randomCell(0.03))
		);

		seedInitialPatterns();
		recentActivity = [];
	}

	function seedInitialPatterns() {
		const travelers = Math.max(10, Math.floor((COLS * ROWS) / 140));
		const bigPatterns = Math.max(1, Math.floor((COLS * ROWS) / 1200));

		for (let i = 0; i < travelers; i++) {
			injectSpecificPattern(grid, i % 3 === 0 ? 'lwss' : 'glider', true);
		}

		for (let i = 0; i < bigPatterns; i++) {
			if (Math.random() > 0.65) injectSpecificPattern(grid, 'pulsar', true);
		}

		if (COLS > 60 && ROWS > 35 && Math.random() > 0.45) {
			injectSpecificPattern(grid, 'gosper', true);
		}
	}

	function countNeighbors(x: number, y: number) {
		let sum = 0;

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				const nx = (x + dx + COLS) % COLS;
				const ny = (y + dy + ROWS) % ROWS;
				sum += grid[ny][nx].state;
			}
		}

		return sum;
	}

	function nextGeneration() {
		const next = grid.map((row) =>
			row.map((cell: any) => ({
				state: cell.state,
				age: cell.age,
				glow: Math.max(0, cell.glow * 0.94)
			}))
		);

		let flips = 0;

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = grid[y][x];
				const neighbors = countNeighbors(x, y);

				if (cell.state === 0 && neighbors === 3) {
					next[y][x].state = 1;
					next[y][x].age = 0;
					next[y][x].glow = 1;
					flips++;
				} else if (cell.state === 1 && (neighbors < 2 || neighbors > 3)) {
					next[y][x].state = 0;
					next[y][x].age = 0;
					next[y][x].glow = 0.35;
					flips++;
				} else if (cell.state === 1) {
					next[y][x].age = Math.min(MAX_AGE, cell.age + 1);
					next[y][x].glow = Math.max(next[y][x].glow, 0.18);
				}
			}
		}

		recentActivity.push(flips);
		if (recentActivity.length > 40) recentActivity.shift();

		const avgActivity = recentActivity.length
			? recentActivity.reduce((a, b) => a + b, 0) / recentActivity.length
			: 0;

		if (avgActivity < Math.max(3, COLS * ROWS * 0.004)) {
			if (Math.random() > 0.45) injectSpecificPattern(next, 'glider');
			if (Math.random() > 0.65) injectSpecificPattern(next, 'lwss');
			if (Math.random() > 0.88) injectSpecificPattern(next, 'mwss');
		}

		if (Math.random() > 0.992) {
			injectWeightedPattern(next);
		}

		if (Math.random() > 0.997 && COLS > 60 && ROWS > 35) {
			injectSpecificPattern(next, 'gosper');
		}

		grid = next;
	}

	function injectWeightedPattern(targetGrid: any[][], gentle = false) {
		const chosen = pickPattern();
		injectPatternObject(targetGrid, chosen, gentle);
	}

	function injectSpecificPattern(targetGrid: any[][], name: string, gentle = false) {
		const chosen = PATTERNS.find((p) => p.name === name);
		if (chosen) injectPatternObject(targetGrid, chosen, gentle);
	}

	function injectPatternObject(targetGrid: any[][], patternObj: any, gentle = false) {
		const pattern = transformPattern(patternObj.cells);

		const ph = pattern.length;
		const pw = pattern[0].length;

		const startX = Math.floor(Math.random() * Math.max(1, COLS - pw));
		const startY = Math.floor(Math.random() * Math.max(1, ROWS - ph));

		for (let y = 0; y < ph; y++) {
			for (let x = 0; x < pw; x++) {
				if (!pattern[y][x]) continue;

				const gx = startX + x;
				const gy = startY + y;

				if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
					targetGrid[gy][gx].state = 1;
					targetGrid[gy][gx].age = gentle ? Math.floor(Math.random() * 5) : 0;
					targetGrid[gy][gx].glow = 1;
				}
			}
		}
	}

	function drawGrid() {
		if (!ctx) return;
		const colors = getThemeColors();
		const cellW = Math.ceil(window.innerWidth / COLS);
		const cellH = Math.ceil(window.innerHeight / ROWS);

		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = grid[y][x];
				if (!cell.state && cell.glow < 0.04) continue;

				let alpha = 0;
				let fill = colors.alive;

				if (cell.state) {
					if (cell.age < 2) fill = colors.aliveLight;
					else if (cell.age > 8) fill = colors.aliveDark;
					else fill = colors.alive;

					alpha = 0.11 + Math.min(cell.glow * 0.22, 0.22);
				} else {
					fill = colors.alive;
					alpha = cell.glow * 0.06;
				}

				const px = x * cellW;
				const py = y * cellH;

				ctx.fillStyle = hexToRgba(fill, alpha);
				ctx.fillRect(px, py, cellW, cellH);
			}
		}
	}

	function hexToRgba(hex: string, alpha: number) {
		const clean = hex.replace('#', '');
		const full =
			clean.length === 3
				? clean
						.split('')
						.map((c) => c + c)
						.join('')
				: clean;

		const bigint = parseInt(full, 16);
		const r = (bigint >> 16) & 255;
		const g = (bigint >> 8) & 255;
		const b = bigint & 255;

		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	function animate(time: number) {
		const interval = 1000 / FPS;
		const delta = time - lastTime;

		if (delta >= interval) {
			drawGrid();
			nextGeneration();
			lastTime = time - (delta % interval);
		}

		animationFrame = requestAnimationFrame(animate);
	}

	onMount(() => {
		updateCountdown();
		interval = setInterval(updateCountdown, 1000);

		resizeCanvas();
		animationFrame = requestAnimationFrame(animate);

		window.addEventListener('resize', resizeCanvas);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', resizeCanvas);
			cancelAnimationFrame(animationFrame);
		}
	});

	const formattedStartTime = $derived(
		startTime
			? new Date(startTime).toLocaleString('en-GB', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: 'To be announced'
	);

	const floatingIcons = [
		{ icon: Code, top: '15%', left: '10%', delay: '0s', size: 24, speed: '12s' },
		{ icon: Database, top: '25%', left: '85%', delay: '1.5s', size: 32, speed: '15s' },
		{ icon: Lock, top: '65%', left: '5%', delay: '0.8s', size: 28, speed: '10s' },
		{ icon: Shield, top: '75%', left: '90%', delay: '2.2s', size: 20, speed: '18s' }
	];
</script>

<!-- Pixel Animation Canvas -->
<canvas bind:this={canvas} id="pixel-bg"></canvas>

<!-- Background Overlay Gradients -->
<div id="bg-overlay"></div>

<div
	class="relative flex min-h-[calc(100vh-100px)] w-full flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Floating Elements -->
	{#each floatingIcons as item}
		<div
			class="animate-float z-2 text-primary/30 pointer-events-none absolute"
			style="top: {item.top}; left: {item.left}; --float-delay: {item.delay}; --float-speed: {item.speed};"
		>
			<item.icon size={item.size} strokeWidth={1} />
		</div>
	{/each}

	<!-- Foreground Content -->
	<div class="relative z-10 w-full max-w-4xl space-y-16 p-8 md:p-16">
		<div class="space-y-6">
			<h1
				class="text-foreground pb-2 text-5xl font-black leading-tight tracking-tighter md:text-8xl"
			>
				{title}
			</h1>
			<p class="mx-auto max-w-xl text-xl font-medium leading-relaxed opacity-80">
				The CTF starts on <span class="text-primary font-bold">{formattedStartTime}</span>.
			</p>
			<p class="mx-auto max-w-xl text-lg font-medium italic opacity-60">Prepare your horses</p>
		</div>

		<!-- Countdown Units -->
		<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
			{#each [{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }, { label: 'Minutes', value: timeLeft.minutes }, { label: 'Seconds', value: timeLeft.seconds }] as unit}
				<div class="group flex flex-col items-center">
					<span
						class="text-foreground font-mono text-5xl font-black tabular-nums tracking-tighter md:text-8xl"
					>
						{String(unit.value).padStart(2, '0')}
					</span>
					<span
						class="text-muted-foreground mt-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-50"
					>
						{unit.label}
					</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	#pixel-bg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		image-rendering: pixelated;
		pointer-events: none;
		opacity: 0.34;
		transform: scale(1.03);
		filter: blur(4px) saturate(0.9);
		background: transparent;
	}

	#bg-overlay {
		position: fixed;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background: radial-gradient(
				circle at 50% 50%,
				transparent 0,
				transparent 10rem,
				rgba(247, 247, 248, 0.28) 24rem,
				rgba(247, 247, 248, 0.92) 44rem
			),
			linear-gradient(
				to bottom,
				rgba(247, 247, 248, 0.92) 0%,
				transparent 22%,
				transparent 78%,
				rgba(247, 247, 248, 0.92) 100%
			);
	}

	:global(.dark) #bg-overlay {
		background: radial-gradient(
				circle at 50% 50%,
				transparent 0,
				transparent 10rem,
				rgba(5, 5, 5, 0.2) 24rem,
				rgba(5, 5, 5, 0.84) 44rem
			),
			linear-gradient(
				to bottom,
				rgba(5, 5, 5, 0.84) 0%,
				transparent 22%,
				transparent 78%,
				rgba(5, 5, 5, 0.84) 100%
			);
	}

	@keyframes float {
		0% {
			transform: translate(0, 0) rotate(0deg);
		}
		33% {
			transform: translate(10px, -15px) rotate(3deg);
		}
		66% {
			transform: translate(-5px, -25px) rotate(-3deg);
		}
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
	}

	.animate-float {
		animation: float var(--float-speed) ease-in-out infinite;
		animation-delay: var(--float-delay);
	}
</style>
