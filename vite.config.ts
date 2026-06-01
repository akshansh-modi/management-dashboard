import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
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
          // Uses the environment variable VITE_API_BASE_URL if set, else defaults to local 8080
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false,
        },
      },
    },
  };
})
