import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8452,
    strictPort: true
  },
  build: {
    // three is ~470KB of the bundle and changes far less often than game code;
    // a stable chunk means repeat visitors only re-fetch what changed.
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
    chunkSizeWarningLimit: 900
  }
});
