import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/owlbear/",
  plugins: [react()],
  server: {
    cors: true,
  },
  preview: {
    cors: true,
  },
});
