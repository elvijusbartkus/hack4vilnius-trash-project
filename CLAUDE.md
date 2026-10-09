# CLAUDE.md

@AGENTS.md

- **Read `PRD.md` first.** It is the source of truth for this project.
- **UI text is Lithuanian.** Code, comments and identifiers stay in English.
- **Mobile-first.** The resident and driver views are used on phones; only `/ops` is desktop.
- **Keep components simple.** Plain React + Tailwind, no extra UI libraries unless needed.
- **Hackathon prototype:** prefer working over perfect. Ship the demo flow (PRD section 10) first.
- Constants and prices live in `lib/config.ts`. Colour tokens (`green`, `clay`, `sand`, `ink`) are in `app/globals.css` (`@theme`).
- Leaflet must be client-only (dynamic import with `ssr: false`).
- `SUPABASE_SERVICE_ROLE_KEY` is for `scripts/` only. Never import it in app code.
