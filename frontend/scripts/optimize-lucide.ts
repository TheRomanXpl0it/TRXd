import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Plugin } from 'vite';

export function optimizeLucideImports(): Plugin {
	const lucideMap = new Map<string, string>();
	try {
		const base = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/@lucide/svelte/dist');
		const filesToRead = [
			resolve(base, 'icons/index.js'),
			resolve(base, 'aliases/aliases.js'),
			resolve(base, 'aliases/suffixed.js'),
			resolve(base, 'aliases/prefixed.js')
		];
		const regex = /default as (\w+)\s*\}\s*from\s*['"](?:\.\/|\.\.\/icons\/)([\w-]+)\.(?:svelte|js)['"]/g;
		for (const file of filesToRead) {
			if (!fs.existsSync(file)) continue;
			const content = fs.readFileSync(file, 'utf-8');
			let match: RegExpExecArray | null;
			while ((match = regex.exec(content)) !== null) {
				lucideMap.set(match[1], match[2]);
			}
		}
	} catch {
		// Fallback if node_modules path resolution fails
	}

	return {
		name: 'optimize-lucide-imports',
		enforce: 'pre',
		transform(code: string, id: string) {
			if (!code.includes('@lucide/svelte') || id.includes('node_modules')) {
				return null;
			}
			const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@lucide\/svelte['"];?/gs;
			const transformed = code.replace(importRegex, (_, specifiers) => {
				const parts = specifiers
					.split(',')
					.map((s: string) => s.trim())
					.filter(Boolean);
				const replacements: string[] = [];
				for (const part of parts) {
					const match = part.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
					if (!match) continue;
					const [, imported, local] = match;
					const fileName = lucideMap.get(imported);
					if (fileName) {
						replacements.push(`import ${local || imported} from '@lucide/svelte/icons/${fileName}';`);
					} else {
						replacements.push(`import { ${part} } from '@lucide/svelte';`);
					}
				}
				return replacements.join('\n');
			});

			return { code: transformed, map: null };
		}
	};
}
