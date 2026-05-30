import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'chamomile-stabilize-ranch.ngrok-free.dev',
      'localhost',
      '[IP_ADDRESS]'
    ],
    port: 5174, // Avoid conflict with Sanitary-Direct (5173)
    proxy: {
      '/api': {
        // Local procurement-service (run with `./mvnw spring-boot:run`).
        // The backend serves under context-path /procurement on port 8080.
        // To hit the deployed backend instead, swap target back to the Render URL.
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
    },
  },
})
