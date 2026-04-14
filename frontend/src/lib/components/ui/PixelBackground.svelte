<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { 
		opacity = 0.34,
		overlayOpacity = 0.28,
		theme = 'default' // 'default' or 'finished'
	} = $props<{
		opacity?: number;
		overlayOpacity?: number;
		theme?: 'default' | 'finished' | 'mixed';
	}>();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;

	// Game of Life Logic constants
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

	function getThemeColorsByTheme(t: string) {
		const isDark = document.documentElement.classList.contains('dark');
		
		if (t === 'finished') {
			if (isDark) {
				return {
					alive: '#a1a1aa', // zinc-400
					aliveLight: '#d4d4d8', // zinc-300
					aliveDark: '#52525b' // zinc-600
				};
			}
			return {
				alive: '#71717a', // zinc-500
				aliveLight: '#a1a1aa', // zinc-400
				aliveDark: '#3f3f46' // zinc-700
			};
		}

		// Success/Teal theme (default)
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
		return {
			s: state,
			a: age,
			g: glow,
			t: Math.random() > 0.5 ? 1 : 0 // 0: teal, 1: gray
		};
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
				sum += grid[ny][nx].s;
			}
		}
		return sum;
	}

	function nextGeneration() {
		const next = grid.map((row) =>
			row.map((cell: any) => ({
				s: cell.s,
				a: cell.a,
				g: Math.max(0, cell.g * 0.94),
				t: cell.t
			}))
		);

		let flips = 0;

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = grid[y][x];
				const neighbors = countNeighbors(x, y);

				if (cell.s === 0 && neighbors === 3) {
					next[y][x].s = 1;
					next[y][x].a = 0;
					next[y][x].g = 1;
					flips++;
				} else if (cell.s === 1 && (neighbors < 2 || neighbors > 3)) {
					next[y][x].s = 0;
					next[y][x].a = 0;
					next[y][x].g = 0.35;
					flips++;
				} else if (cell.s === 1) {
					next[y][x].a = Math.min(MAX_AGE, cell.a + 1);
					next[y][x].g = Math.max(next[y][x].g, 0.18);
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
					targetGrid[gy][gx].s = 1;
					targetGrid[gy][gx].a = gentle ? Math.floor(Math.random() * 5) : 0;
					targetGrid[gy][gx].g = 1;
				}
			}
		}
	}

	function drawGrid() {
		if (!ctx) return;
		
		const tealColors = getThemeColorsByTheme('default');
		const grayColors = getThemeColorsByTheme('finished');
		
		const cellW = Math.ceil(window.innerWidth / COLS);
		const cellH = Math.ceil(window.innerHeight / ROWS);

		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = grid[y][x];
				if (!cell.s && cell.g < 0.04) continue;

				let alpha = 0;
				
				// Decide color palette
				let palette;
				if (theme === 'mixed') {
					palette = cell.t === 0 ? tealColors : grayColors;
				} else if (theme === 'finished') {
					palette = grayColors;
				} else {
					palette = tealColors;
				}

				let fill = palette.alive;

				if (cell.s) {
					if (cell.a < 2) fill = palette.aliveLight;
					else if (cell.a > 8) fill = palette.aliveDark;
					else fill = palette.alive;

					alpha = 0.11 + Math.min(cell.g * 0.22, 0.22);
				} else {
					fill = palette.alive;
					alpha = cell.g * 0.06;
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
		const full = clean.length === 3
				? clean.split('').map((c) => c + c).join('')
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
		resizeCanvas();
		animationFrame = requestAnimationFrame(animate);
		window.addEventListener('resize', resizeCanvas);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', resizeCanvas);
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<canvas bind:this={canvas} id="pixel-bg" style="opacity: {opacity}"></canvas>
<div id="bg-overlay" style="--overlay-opacity: {overlayOpacity}"></div>

<style>
	#pixel-bg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		image-rendering: pixelated;
		pointer-events: none;
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
				rgb(247 247 248 / calc(var(--overlay-opacity) * 1.0)) 24rem,
				rgb(247 247 248 / 0.92) 44rem
			),
			linear-gradient(
				to bottom,
				rgb(247 247 248 / 0.92) 0%,
				transparent 22%,
				transparent 78%,
				rgb(247 247 248 / 0.92) 100%
			);
	}

	:global(.dark) #bg-overlay {
		background: radial-gradient(
				circle at 50% 50%,
				transparent 0,
				transparent 10rem,
				rgb(5 5 5 / calc(var(--overlay-opacity) * 0.71)) 24rem,
				rgb(5 5 5 / 0.84) 44rem
			),
			linear-gradient(
				to bottom,
				rgb(5 5 5 / 0.84) 0%,
				transparent 22%,
				transparent 78%,
				rgb(5 5 5 / 0.84) 100%
			);
	}
</style>
