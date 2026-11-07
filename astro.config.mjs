import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://jin-sushi-restaurant.pages.dev",
  output: "static",
  build: {
    format: "file"
  }
});
