# Yolink — Codex project notes

**Start here: read `docs/HANDOFF.md` before making any changes.** It contains the full planning-phase decision log, architecture, RPC contract, current status, and what remains unverified.

Quick facts:
- Hinge-styled professional networking MVP. Static HTML/CSS/JS + Supabase free tier. **No frameworks, no build step, no npm deps** — deliberate owner choice.
- All writes go through SECURITY DEFINER RPCs in `supabase/schema.sql`; the anon key is read-only by design. Keep new mutations behind RPCs that validate the secret code.
- `config.js` placeholders → app runs in localStorage **demo mode** (seeded logins `YO-DEMO-0001..0003`). Real Supabase project does not exist yet.
- Escape all user-generated text with the existing `esc()` helpers before inserting into HTML.
- Design tokens live in `styles.css :root` (plum `#3a1b3f`, paper `#faf8f5`, Georgia serif display, pill buttons). `admin.html` intentionally inlines copies — update both if tokens change.
- Run locally: `npx -y serve -l 4173 .`
- If Supabase is unreachable (VPN/regional blocking): HANDOFF.md §9 maps every Supabase dependency (DB, RPC writes, reads, realtime chat) to replacement plans — the backend is isolated behind one 10-method API object in `app.js`, so swaps don't touch the UI.
