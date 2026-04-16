import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProduction = mode === 'production';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const configuredBase = env.VITE_BASE_PATH?.trim();
  const normalizedBase = configuredBase
    ? `/${configuredBase.replace(/^\/+|\/+$/g, '')}/`
    : repoName
      ? `/${repoName}/`
      : '/';

  return {
    base: isProduction ? normalizedBase : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : 'inline',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@google/genai')) {
              return 'ai';
            }

            if (id.includes('recharts')) {
              return 'charts';
            }

            if (id.includes('lucide-react') || id.includes('motion')) {
              return 'ui';
            }

            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }

            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
