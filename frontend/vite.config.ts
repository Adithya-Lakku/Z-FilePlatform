import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/ requests to FastAPI backend
      '/api': {
        target: 'http://fastapi_app:8000',
        changeOrigin: true,
      },
    },
  },
})
