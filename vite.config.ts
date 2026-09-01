import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

// Load env variables for dev API functions
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
        
        if (url === '/api/send-recruitment-email') {
          let bodyStr = '';
          req.on('data', (chunk: any) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = {};
              }

              const { default: handler } = await server.ssrLoadModule('/api/send-recruitment-email.ts');
              
              const mockRes = {
                statusCode: 200,
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: function (code: number) {
                  this.statusCode = code;
                  return this;
                },
                json: function (data: any) {
                  res.statusCode = this.statusCode;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                },
                end: function (data?: any) {
                  res.statusCode = this.statusCode;
                  res.end(data);
                }
              };

              await handler(req, mockRes);
            } catch (err: any) {
              console.error('Dev API Error (/api/send-recruitment-email):', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal error in dev API' }));
            }
          });
          return;
        }

        if (url === '/api/send-registration-email') {
          let bodyStr = '';
          req.on('data', (chunk: any) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = {};
              }

              const { default: handler } = await server.ssrLoadModule('/api/send-registration-email.ts');
              
              const mockRes = {
                statusCode: 200,
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: function (code: number) {
                  this.statusCode = code;
                  return this;
                },
                json: function (data: any) {
                  res.statusCode = this.statusCode;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                },
                end: function (data?: any) {
                  res.statusCode = this.statusCode;
                  res.end(data);
                }
              };

              await handler(req, mockRes);
            } catch (err: any) {
              console.error('Dev API Error (/api/send-registration-email):', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal error in dev API' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
    define: {
      'process.env': {},
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**']
      }
    },
  };
});
