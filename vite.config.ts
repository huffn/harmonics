import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static site: default pages/assets output to `build`.
			adapter: adapter(),
			// Kit 3 removed $lib; keep it so tasks/tests can use the conventional alias.
			alias: { $lib: 'src/lib' }
		})
	],
	test: { include: ['tests/**/*.test.ts'], environment: 'jsdom' }
});
