import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  // Will be "http://back:3000" inside Docker, thanks to compose env
  const backend = env.VITE_BACKEND_ORIGIN || "http://localhost:3000"

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: {
      host: true,         // ensure Vite binds to 0.0.0.0 in the container
      port: 5173,
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
        },
      },
    },
  }
})
