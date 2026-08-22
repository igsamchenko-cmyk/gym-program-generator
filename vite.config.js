import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base відповідає назві репозиторію — так GitHub Pages віддає ресурси
// з правильного шляху https://<user>.github.io/gym-program-generator/
export default defineConfig({
  plugins: [react()],
  base: "/gym-program-generator/",
});
