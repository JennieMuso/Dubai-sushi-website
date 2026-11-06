import { defineConfig } from "astro/config";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  site: "https://jin-downtown-dubai-sushi.jane-framer-expert.chatgpt.site",
  output: "static",
  build: {
    format: "file"
  },
  vite: {
    plugins: [cloudflare()],
    build: {
      sourcemap: true
    }
  }
});
