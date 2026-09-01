import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_ORABBIT_BACKEND_URL || 'http://localhost:8080';

  const proxyConfig = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
    configure: (proxy: any) => {
      proxy.on('error', (err: any, _req: any, res: any) => {
        if (!res.headersSent && res.writeHead) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
          });
          res.end(
            JSON.stringify({
              error: 'Backend master service is currently unreachable',
              target: backendTarget,
              detail: err.message,
            })
          );
        }
      });
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': proxyConfig,
        '/sse': proxyConfig,
        '/status': proxyConfig,
        '/ready': proxyConfig,
        '/healthz': proxyConfig,
        '/metrics': proxyConfig,
        '/workers': proxyConfig,
        '/jobs': proxyConfig,
        '/runs': proxyConfig,
        '/connections': proxyConfig,
      },
    },
  };
});
