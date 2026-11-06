# JIN Dubai

An Astro website for JIN, an editorial fine dining concept in Downtown Dubai. The existing visual system, responsive layouts, image treatments, and scroll motion are preserved while the site is prepared for Cloudflare Workers, Resend, and Cloudflare Turnstile.

## Architecture

```text
Browser
  ├── Astro-generated pages and static assets
  └── POST /api/reservations
          ↓
      Cloudflare Worker
          ├── validates origin and form data
          ├── verifies Cloudflare Turnstile
          └── sends the enquiry through Resend
```

The site is statically rendered by Astro. Cloudflare serves the generated pages and invokes the Worker only for the reservation API.

## Project structure

```text
.
├── public/                  # WebP imagery, CSS, browser scripts, SEO files
├── src/
│   ├── components/         # Shared navigation, footer, and reservation form
│   ├── layouts/            # Shared metadata and document structure
│   └── pages/              # Seven Astro routes
├── worker/index.ts         # Reservation API, Turnstile, and Resend integration
├── tests/                  # Reservation API tests
├── astro.config.mjs
├── cloudflare.config.ts
└── .dev.vars.example       # Local variable template without production secrets
```

## Local development

Requirements: Node.js 24 and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

`npm run dev` starts Astro for design work. Use the Cloudflare development command when testing the Worker and form together:

```bash
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run cf:dev
```

The site key above is Cloudflare's public test key. The matching test secret is documented in `.dev.vars.example` and must never be used in production.

## Configuration

Set `PUBLIC_TURNSTILE_SITE_KEY` as a build variable. Store every other value as a Cloudflare Worker secret.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Public Turnstile widget site key used during the Astro build |
| `TURNSTILE_SECRET_KEY` | Private Turnstile verification secret |
| `RESEND_API_KEY` | Resend API key with sending access |
| `RESERVATION_TO_EMAIL` | Client inbox that receives reservation enquiries |
| `RESERVATION_FROM_EMAIL` | Verified sender, such as `JIN Reservations <reservations@mail.example.com>` |
| `ALLOWED_HOSTNAMES` | Comma-separated production hostnames accepted by origin and Turnstile checks |

Production setup requires:

1. A Cloudflare Turnstile widget registered to the exact production hostname.
2. A Resend sending domain with SPF and DKIM verified. DMARC is recommended.
3. Worker secrets stored through Cloudflare. Do not commit `.dev.vars` or API keys.
4. The final production URL set as Astro's `site` value and in `public/robots.txt` and `public/sitemap.xml`.

## Quality checks

```bash
npm test
npm run build
npm run cf:build
```

The reservation tests cover input normalization, validation, HTML escaping, Turnstile hostname and action checks, Resend delivery, and rejection paths.

## Deployment

Connect the repository to Cloudflare and use the `astro` branch. Build and deploy with:

```bash
npm ci
npm run cf:deploy
```

Add the public site key as a build variable and the five private values above as Worker secrets. The Cloudflare build output is written to `.cloudflare/output/v0/`.

## Content status

JIN, Jin Xiwei's biography, the venue, imagery, menu, prices, and contact details are concept material. Confirm the final business details before public launch.
