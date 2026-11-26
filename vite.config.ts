import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { defineConfig } from 'vite';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}
dotenv.config({ override: false });

const API_ROUTES: Record<string, string> = {
  '/api/auth': '/api/auth.ts',
  '/api/admin-data': '/api/admin-data.ts',
  '/api/email-templates': '/api/email-templates.ts',
  '/api/google-sync': '/api/google-sync.ts',
  '/api/send-recruitment-email': '/api/send-recruitment-email.ts',
  '/api/send-registration-email': '/api/send-registration-email.ts',
  '/api/submit-event-registration': '/api/submit-event-registration.ts',
  '/api/visitor-stats': '/api/visitor-stats.ts',
};

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
        const modulePath = url ? API_ROUTES[url] : undefined;
        if (!modulePath) return next();

        let bodyStr = '';
        req.on('data', (chunk: any) => {
          bodyStr += chunk;
        });
        req.on('end', async () => {
          try {
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              req.body = {};
            }

            const searchParams = new URL(req.url, 'http://localhost').searchParams;
            req.query = Object.fromEntries(searchParams.entries());

            const { default: handler } = await server.ssrLoadModule(modulePath);

            const mockRes = {
              statusCode: 200,
              setHeader: (k: string, v: string) => res.setHeader(k, v),
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              json(data: any) {
                res.statusCode = this.statusCode;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end(data?: any) {
                res.statusCode = this.statusCode;
                res.end(data);
              },
            };

            await handler(req, mockRes);
          } catch (err: any) {
            console.error(`Dev API Error (${url}):`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal error in dev API' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => ({
  base: '/',
  plugins: [react(), tailwindcss(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: {
      ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**'],
    },
  },
}));
