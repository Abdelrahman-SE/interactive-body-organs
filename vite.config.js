import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      svgr(),
      {
        name: 'rename-html',
        closeBundle() {
          const fromPath = path.resolve(__dirname, 'dist/index.html');
          const toPath = path.resolve(__dirname, 'dist/mymovie.html');
          if (fs.existsSync(fromPath)) {
            fs.renameSync(fromPath, toPath);
          }
        }
      }
    ],
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
