import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function localApiDevPlugin(): Plugin {
    return {
        name: 'local-api-dev-middleware',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url !== '/api/verify-access' && req.url !== '/api/admin') {
                    return next();
                }

                const chunks: Buffer[] = [];
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', async () => {
                    try {
                        const rawBody = Buffer.concat(chunks).toString('utf8');
                        const parsedBody = rawBody ? JSON.parse(rawBody) : {};

                        const modulePath =
                            req.url === '/api/verify-access'
                                ? path.resolve(__dirname, 'api/verify-access.ts')
                                : path.resolve(__dirname, 'api/admin.ts');

                        const mod = await server.ssrLoadModule(modulePath);
                        const mockReq = {
                            method: req.method,
                            headers: req.headers,
                            body: parsedBody,
                            socket: req.socket,
                        };
                        const mockRes = {
                            status(code: number) {
                                res.statusCode = code;
                                return this;
                            },
                            setHeader(name: string, value: string) {
                                res.setHeader(name, value);
                            },
                            json(data: unknown) {
                                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                                res.end(JSON.stringify(data));
                            },
                            end(body?: string) {
                                res.end(body);
                            },
                        };

                        await mod.default(mockReq, mockRes);
                    } catch {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.end(JSON.stringify({ ok: false, message: 'Error interno en endpoint local.' }));
                    }
                });
            });
        },
    };
}

export default defineConfig(() => {
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [
            react(),
            localApiDevPlugin(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: [
                    'apple-touch-icon.png',
                    'pwa-192x192.png',
                    'pwa-512x512.png',
                    'pwa-maskable-512x512.png',
                ],
                manifest: {
                    id: '/',
                    name: '6ta Feria Latinoamérica Territorio Canva',
                    short_name: 'Feria Canva',
                    description:
                        '9 talleres navideños en Canva con 8 colaboradores de Latinoamérica. Del 23 al 27 de noviembre de 2026.',
                    theme_color: '#2E4F35',
                    background_color: '#2E4F35',
                    display: 'standalone',
                    start_url: '/',
                    scope: '/',
                    icons: [
                        {
                            src: '/pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-maskable-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                    navigateFallbackDenylist: [/^\/api\//],
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'google-fonts-cache',
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365,
                                },
                                cacheableResponse: {
                                    statuses: [0, 200],
                                },
                            },
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'gstatic-fonts-cache',
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365,
                                },
                                cacheableResponse: {
                                    statuses: [0, 200],
                                },
                            },
                        },
                    ],
                },
                devOptions: {
                    enabled: true,
                    type: 'module',
                },
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
