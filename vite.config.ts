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
			// Empty for the NAS (served at the root); the GitHub Pages workflow
			// sets BASE_PATH=/harmonics because Pages serves under /<repo>.
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` }
		})
	],
	test: { include: ['tests/**/*.test.ts'], environment: 'jsdom' }
});
