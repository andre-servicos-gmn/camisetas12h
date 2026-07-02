import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend Vite da C12H. Em dev, conversa com o backend FastAPI em :8000
// (a URL fica em VITE_API_URL, ver .env).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
});
