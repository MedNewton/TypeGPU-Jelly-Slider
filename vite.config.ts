import { defineConfig } from 'vite';
import typegpuPlugin from 'unplugin-typegpu/vite';

export default defineConfig({
  plugins: [typegpuPlugin()],
  build: {
    target: 'esnext' // or 'es2022' or specific browsers: 'chrome89,edge89,firefox108,safari15.4'
  }
});
