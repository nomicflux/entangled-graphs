import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const repoName = "entangled-graphs";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${repoName}/` : "/",
  plugins: [vue()],
});
