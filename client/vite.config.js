import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/status': 'http://localhost:3001',
            '/connect': 'http://localhost:3001',
            '/logout': 'http://localhost:3001',
            '/reset': 'http://localhost:3001',
            '/groups': 'http://localhost:3001',
            '/send': 'http://localhost:3001',
        },
    },
});
