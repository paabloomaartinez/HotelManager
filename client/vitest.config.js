import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 👈 Importar path para definir los alias

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
})
