import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "jin-dubai",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-10-13",
    env: {
      RESEND_API_KEY: bindings.secret(),
      TURNSTILE_SECRET_KEY: bindings.secret(),
      RESERVATION_TO_EMAIL: bindings.secret(),
      RESERVATION_FROM_EMAIL: bindings.secret(),
      ALLOWED_HOSTNAMES: bindings.secret()
    },
    observability: {
      enabled: true
    }
  }
});
