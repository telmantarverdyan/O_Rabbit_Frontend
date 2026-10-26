import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';
import https from 'node:https';
import path from 'path';

// Paths forwarded to the O_Rabbit master. Everything else is the SPA itself,
// so UI routes like /runs never collide with the master's legacy /runs alias.
const MASTER_PATHS = ['/api/', '/status', '/healthz', '/ready', '/metrics'];
const MASTER_HEADER = 'x-orabbit-master';
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host', MASTER_HEADER]);

function sendProxyError(res: http.ServerResponse, status: number, message: string) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

/**
 * Forwards master API calls to the master the user logged into.
 *
 * The browser cannot call the master directly because the master sends no
 * CORS headers. Instead the UI sends every request to this server with the
 * master's address in the X-ORabbit-Master header, and this middleware relays
 * it (streaming, so SSE works). It only accepts http(s) origins, never paths.
 */
function masterProxy(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url || '';
    if (!MASTER_PATHS.some((p) => url === p.replace(/\/$/, '') || url.startsWith(p) || url.startsWith(`${p}?`))) {
      next();
      return;
    }

    const rawTarget = req.headers[MASTER_HEADER];
    if (typeof rawTarget !== 'string' || !rawTarget) {
      sendProxyError(res, 400, 'Not connected to a master: log in first');
      return;
    }
    let target: URL;
    try {
      target = new URL(rawTarget);
    } catch {
      sendProxyError(res, 400, `Invalid master address "${rawTarget}"`);
      return;
    }
    if ((target.protocol !== 'http:' && target.protocol !== 'https:') || target.pathname !== '/') {
      sendProxyError(res, 400, 'Master address must be an http(s) origin such as http://10.0.0.5:9100');
      return;
    }

    const headers: http.OutgoingHttpHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(key.toLowerCase()) && value !== undefined) headers[key] = value;
    }

    const transport = target.protocol === 'https:' ? https : http;
    const upstream = transport.request(
      new URL(url, target),
      { method: req.method, headers, timeout: 15000 },
      (upstreamRes) => {
        const responseHeaders = { ...upstreamRes.headers };
        delete responseHeaders.connection;
        res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
        upstreamRes.pipe(res);
      }
    );
    // The timeout only covers connecting and idle sockets before a response;
    // once a stream starts, the SSE keepalive keeps it busy.
    upstream.on('timeout', () => upstream.destroy(new Error('connection timed out')));
    upstream.on('response', () => upstream.setTimeout(0));
    upstream.on('error', (err) => {
      sendProxyError(res, 502, `Master ${target.origin} is unreachable: ${err.message}`);
    });
    // Closing the browser request (for example leaving a live run page) must
    // close the upstream SSE stream too.
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  };

  return {
    name: 'orabbit-master-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), masterProxy()],
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
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
