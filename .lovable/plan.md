# Department Budget Tracker — Landing + Login

Build a Tuyo-inspired marketing landing page (light theme) and a companion login page, matching Tuyo's minimal-luxe aesthetic: oversized serif headline, hand-drawn underline accent, a single pill CTA, generous whitespace, minimal top nav, and one hero product visual on a cream card below.

## Visual direction (light-theme reinterpretation of tuyo.com)

- **Background**: warm off-white / cream (`#faf8f2`) instead of Tuyo's black.
- **Foreground text**: near-black (`#0d0d0d`).
- **Accent**: keep Tuyo's signature electric lime green (`#c6f24e`) for the CTA pill, hand-drawn underline, and small nav dot.
- **Secondary card surface** (hero product mock area): soft ivory (`#f1ede2`) — inverse of Tuyo's cream-on-black card.
- **Typography**: bold display serif for the hero headline (Instrument Serif / Fraunces feel), clean geometric sans for body and UI (Inter/Manrope).
- **Shape language**: fully rounded pill buttons, generous radii on cards, thin underline scribble SVG under the headline.

## Pages

### 1. `/` — Landing page (`src/routes/index.tsx`, replacing placeholder)

Single-scroll marketing page, sections top-to-bottom:

1. **Top nav** — small wordmark left ("budgetry" or similar; final name TBD — placeholder "Ledgerly"), centered minimal links (Home · Features · How it works · Contact), right-side pill button "Sign in" → `/login`.
2. **Hero** — oversized serif headline: *"Track every rupiah, approve in seconds."* Hand-drawn lime underline SVG beneath. Subcopy: "The department budget tracker that handles requisitions, PRFs, multi-layer approvals, and live budget visibility." Single lime pill CTA "Get started →" → `/login`. Small caption "Trusted by finance teams across 20+ departments."
3. **Product visual card** — large rounded ivory card containing a mocked dashboard preview (styled divs, no image gen): sidebar, budget progress ring, a requisition list row, an approval-status chip. Purely CSS/HTML.
4. **Features grid** — 4 feature cards on cream: Requisition Submission, PRF Generator, Layered Approvals, Real-time Budget. Each card: icon (lucide), short serif title, one line of body copy.
5. **How it works** — 3 numbered steps: Submit → Approve → Track.
6. **CTA band** — serif headline "Ready to take control of your budget?" + pill CTA to `/login`.
7. **Footer** — wordmark, small nav, copyright.

### 2. `/login` — Login page (`src/routes/login.tsx`)

- Split composition: left = cream panel with the same wordmark, a serif welcome line ("Welcome back."), and one short supporting sentence. Right = form card on ivory background.
- Form fields: Email, Password, "Remember me" checkbox, lime pill "Sign in" button, muted "Forgot password?" link, and a "Don't have an account? Request access" line (non-functional link for now).
- **No backend / no Lovable Cloud yet** — form is UI only; submit handler shows a toast "Auth not connected yet" (using existing shadcn `sonner` if available, else a simple inline message). This keeps scope to landing + login UI as requested. When the user is ready to wire real auth, we enable Lovable Cloud in a follow-up.

## Design system changes (`src/styles.css`)

- Update `:root` tokens to the cream/near-black/lime palette above (keep oklch format).
- Add `--color-accent-lime`, `--gradient-hero`, and a subtle `--shadow-card` token.
- Register a display serif + body sans via `<link>` tag in `src/routes/__root.tsx` head (Google Fonts: Instrument Serif + Inter), and add `--font-display` / `--font-sans` under `@theme`.
- Leave dark-mode tokens intact but out of scope.

## Root route updates (`src/routes/__root.tsx`)

- Replace placeholder title/description with real app metadata: title "Ledgerly — Department Budget Tracker", matching description, og:title, og:description, og:type, twitter:card. No og:image (leaf-only rule; none needed yet).
- Add Google Fonts `<link>` tags in `links`.

## Out of scope (call out to user before build)

- Real authentication / database (would require enabling Lovable Cloud).
- Actual requisition / PRF / approval workflows (this is only the marketing landing + login shell).
- Dashboard app screens post-login.

## Technical notes

- Stack: TanStack Start + Tailwind v4 (existing).
- New file: `src/routes/login.tsx` with `createFileRoute("/login")`.
- Rewrite: `src/routes/index.tsx` (removes placeholder, adds landing).
- Edit: `src/styles.css` (tokens + fonts), `src/routes/__root.tsx` (metadata + font links).
- Components co-located in `src/components/landing/` (Nav, Hero, FeatureGrid, HowItWorks, CtaBand, Footer) for readability.
- Use only shadcn primitives already present (`Button`, `Input`, `Label`, `Checkbox`); no new deps.
