# JIN Dubai

An Astro website for JIN, an editorial fine dining concept in Downtown Dubai. The existing visual system, responsive layouts, image treatments, and scroll motion are preserved while the site runs on Cloudflare Pages with a Pages Function, Resend, and Cloudflare Turnstile.

## Architecture

```text
Browser
  ├── Astro-generated pages and static assets
  └── POST /api/reservations
          ↓
      Cloudflare Pages Function
          ├── validates origin and form data
          ├── verifies Cloudflare Turnstile
          └── sends the enquiry through Resend
```

The site is statically rendered by Astro. Cloudflare serves the generated pages and invokes a Pages Function on the Workers runtime only for the reservation API.

## Project structure

```text
.
├── public/                  # WebP imagery, CSS, browser scripts, SEO files
├── src/
│   ├── components/         # Shared navigation, footer, and reservation form
│   ├── layouts/            # Shared metadata and document structure
│   └── pages/              # Seven Astro routes
├── functions/api/          # Reservation API, Turnstile, and Resend integration
├── tests/                  # Reservation API tests
├── astro.config.mjs
└── .dev.vars.example       # Local variable template without production secrets
```

## Local development

Requirements: Node.js 24 and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

`npm run dev` starts Astro for design work. `.dev.vars` is ignored by Git and may hold local Pages Function values. `.dev.vars.example` contains names and placeholders only.

## Configuration

Set `PUBLIC_TURNSTILE_SITE_KEY` as a Pages build variable. Store every other value as an encrypted Cloudflare Pages secret.

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
3. Pages secrets stored through Cloudflare. Do not commit `.env`, `.dev.vars`, API keys, or Turnstile secrets.
4. The production URL `https://jin-sushi-restaurant.pages.dev` registered in Turnstile and used by the website metadata.

## Quality checks

```bash
npm test
npm run build
```

The reservation tests cover input normalization, validation, HTML escaping, Turnstile hostname and action checks, Resend delivery, and rejection paths.

## Deployment

Create the Cloudflare Pages project as `jin-sushi-restaurant` and connect this repository with:

- Production branch: `astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Add the public site key as a build variable and the five private values above as encrypted Pages secrets. Cloudflare then deploys every push to the `astro` branch at `https://jin-sushi-restaurant.pages.dev`.

## Content status

JIN, Jin Xiwei's biography, the venue, imagery, menu, prices, and contact details are concept material. Confirm the final business details before public launch.
