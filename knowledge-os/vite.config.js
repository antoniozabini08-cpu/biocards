import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único index.html com todo o JS e CSS embutido, que funciona
// aberto direto do disco ou publicado em qualquer hospedagem estática.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'site', emptyOutDir: true }
});
