# CLAUDE.md

@AGENTS.md

- **Read `PRD.md` first.** It is the source of truth for this project.
- **UI text is Lithuanian.** Code, comments and identifiers stay in English.
- **Resident `/` is a web-first dashboard** (1440px main view, responsive to 390px): separate panels, one deep-green hero, no modal popups (users found them ad-like); actions confirm inline and undo via the toast.
- **The driver app is built by a teammate in a separate codebase.** Do not create driver pages or driver-only code here; we integrate later. There is no `/ops` or route view on our side either.
- **Keep components simple.** Plain React + Tailwind, no extra UI libraries unless needed.
- **Hackathon prototype:** prefer working over perfect. Ship the demo flow (PRD section 10) first.
- Constants and prices live in `lib/config.ts`. Colour tokens (`green`, `clay`, `sand`, `ink`) are in `app/globals.css` (`@theme`).
- Leaflet must be client-only (dynamic import with `ssr: false`).
- `SUPABASE_SERVICE_ROLE_KEY` is for `scripts/` only. Never import it in app code.
