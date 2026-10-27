import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				loadPaths: [fileURLToPath(new URL('.', import.meta.url))],
				additionalData: `@use 'src/styles/variables' as *;`
			}
		}
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	}
});
