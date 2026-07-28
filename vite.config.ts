import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            registerType: 'prompt',
            injectRegister: false,
            manifest: false,
            includeAssets: [
                'apple-touch-icon.png',
                'icons/*.png',
                'manifest.webmanifest',
                'assets/**/*',
            ],
            injectManifest: {
                globPatterns: [
                    '**/*.{js,css,html,ico,png,svg,woff,woff2,wav,mp3,webmanifest}',
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    server: {
        port: 3000,
    },
    build: {
        target: 'esnext',
    },
    base: '/',
});
