import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default ({ mode }) => {
    // Load app-level env vars to node-level env vars.
    process.env = {...process.env, ...loadEnv(mode, process.cwd())};

    // Set backend URL based on mode
    const backendUrl = mode === 'development' 
        ? 'http://localhost:3000' 
        : 'https://oasis-backend-989700633460.asia-south1.run.app';

    return defineConfig({
      plugins: [react(), tailwindcss()],
      // To access env vars here use process.env.TEST_VAR
      define: {
        'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl)
      }
    });
}
