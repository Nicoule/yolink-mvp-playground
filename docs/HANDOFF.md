# Yolink — Agent Handoff Document

> Written 2026-07-10 by Claude (Fable 5) after the initial build session.
> Audience: any AI agent (or human) picking up this project cold.
> Read this top to bottom before changing anything.

---

## 1. What this project is

**Yolink** is a friends-and-family MVP of a professional networking app, deliberately styled after **Hinge** (the dating app). Working professionals create a profile centered on two free-text prompts, browse a pool of members, send "Let's network" / "Coffee chat" requests, and get a real-time chat room when a match forms.

**Product goal (owner's words):** "Help working professionals connect with intention with industry experts in the pool to begin networking."

**Owner:** Matt Ho (matt.hoht@gmail.com) — a PM, comfortable with light dev work but not a heavy engineer. He previously built a single-file HTML app (`../gym_game_scheduler`) deployed to Vercel; that lightweight style is the deliberate template for this project. Do not introduce frameworks, build steps, or npm dependencies without asking him.

**Phase 1 (this build):** everything manual and lightweight. Staff track members in an Excel sheet and create matches by hand via an internal admin page.
**Phase 2 (future, not built):** system auto-matching by similar interests, real auth, photo upload, notifications.

---

## 2. Decision log (from the planning phase)

Every one of these was an explicit choice Matt approved during planning — don't silently reverse them:

| Decision | Choice | Why / notes |
|---|---|---|
| App name | **Yolink** | Matt picked it. Shows in UI, tab title, folder name. |
| Stack | **Static HTML/CSS/JS on Vercel + Supabase free tier** | No server code, no build step. Matches his volleyball-app workflow. Rejected: Next.js (too much setup), Firebase (clunkier relational fit). |
| Identity | **No real auth — name + secret code** (e.g. `YO-7F3K-QM2X`) | Zero-friction for a trusted pool. Matt explicitly accepted the impersonation/lost-code tradeoffs. Rejected: magic links, passwords. |
| Match flow | **Request → accept** (Hinge-style), plus staff-created matches | "Connect with intention." Mutual pending requests auto-match. Rejected: instant match, staff-approval-only. |
| Chat | **Real-time chat room per match** (Supabase Realtime) | The Hinge "new message appears" feel was a core ask. |
| Profile shape | **Prompts + light structure**: name, title, company (optional), industry, years of experience + two prompt cards | The prompts — "My background is in…" and "I'm looking to network with…" — are the heart of the product and are rendered as Hinge-signature prompt cards (small uppercase label, large serif answer). |
| Visuals | **Auto-generated initials avatars** (colored monogram) | No photo upload in MVP. |
| Staff matching | **admin.html with two search fields + Match button** | Mirrors Matt's ask: staff do matching manually alongside an Excel sheet; directory has per-row Copy-ID buttons for that sheet. |

The original approved plan file lives at `C:\Users\matth\.claude\plans\reference-hinge-the-dating-soft-dove.md` (outside this repo).

---

## 3. Architecture

```
Browser (static SPA) ──supabase-js v2 (CDN)──► Supabase
  index.html + app.js + styles.css              - Postgres tables
  admin.html (staff tool, standalone)           - SECURITY DEFINER RPCs (ALL writes)
  localStorage: session {code, profile}         - Realtime (messages, matches, requests)
Hosted on Vercel (plain static deploy, no build)
```

### Security model (intentional, documented tradeoff — do not "fix" without Matt)
- The anon key can **SELECT** `profiles`, `requests`, `matches`, `messages` (RLS `using (true)`). Anyone who views source can read all pool data, including messages. Matt accepted this for a trusted pool; README warns users.
- The anon key can **write nothing directly**. Every mutation is a `SECURITY DEFINER` Postgres function that validates the caller's secret code (`_yolink_auth`) or the staff passcode (`app_config.admin_passcode`).
- `profile_secrets` and `app_config` have RLS enabled with **no policies** → invisible to the anon key. Internal helpers (`_yolink_*`) have EXECUTE revoked from anon.
- Lost secret code = staff retrieves it from `profile_secrets` via the Supabase dashboard.

### Demo mode (important for testing)
`app.js` ships two API implementations behind one interface. If `config.js` still has the placeholder `"YOUR_SUPABASE_URL"`, the app runs **demo mode**: a localStorage-backed mock (`yolink_demo_db` key) with the same methods, same error tokens, and cross-tab "realtime" via `storage` events. It seeds 3 sample members on first run with login codes `YO-DEMO-0001` … `YO-DEMO-0003`. This is how the whole flow was verified without a backend. `admin.html` does NOT have a demo mode — it shows a "Supabase not configured" notice instead.

---

## 4. File map

```
yolink/
  index.html            App shell: all screens as <section class="screen"> nodes, bottom nav, match overlay, toast
  app.js                Everything: API layer (Supabase + demo mock), state, router, renderers, realtime
  styles.css            Design system (see §6) — shared by index.html only
  config.js             window.YOLINK_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY } — placeholders until Matt fills them
  admin.html            Staff tool. Fully self-contained (inline CSS/JS, duplicates design tokens on purpose)
  supabase/schema.sql   Entire backend: tables, RLS, RPCs, realtime publication. Idempotent-ish (create if not exists / or replace)
  README.md             Owner-facing setup guide (Supabase setup, deploy, staff how-to, security tradeoffs)
  docs/HANDOFF.md       This file
  CLAUDE.md             Pointer here for Claude Code agents
  .gitignore            .vercel, node_modules (repo is NOT git-initialized yet)
```

### Data model / RPC contract (source of truth: `supabase/schema.sql`)
Tables: `profiles`, `profile_secrets`, `requests` (kind: `network|coffee`; status: `pending|accepted|passed`; unique from+to), `matches` (user_a < user_b canonical order, unique pair, source: `mutual|staff`), `messages`, `app_config`.

RPCs (called via `sb.rpc(name, args)`; errors surface as SCREAMING_SNAKE tokens in `error.message`, mapped to friendly text by `ERROR_MESSAGES` in app.js and `friendlyError` in admin.html):
- `create_profile(p_name, p_title, p_company, p_industry, p_years_exp, p_background, p_looking_for, p_avatar_color)` → `{profile, secret_code}`
- `login(p_code)` → profile row (codes are upper-cased/trimmed server-side)
- `update_profile(p_code, …fields)` → profile row
- `send_request(p_code, p_to_id, p_kind)` → `{matched, match_id?}` — **auto-matches if a reverse pending request exists**
- `respond_request(p_code, p_request_id, p_accept)` → `{matched, match_id?}`
- `send_message(p_code, p_match_id, p_body)` → message row (sender must belong to match)
- `admin_match(p_admin_pass, p_user_a, p_user_b)` → `{match_id}` (idempotent for existing pair)
- `admin_check(p_admin_pass)` → boolean (admin.html gate)

Error tokens: `INVALID_CODE`, `ALREADY_REQUESTED`, `ALREADY_MATCHED`, `SELF_REQUEST`, `NOT_YOUR_REQUEST`, `ALREADY_HANDLED`, `NOT_YOUR_MATCH`, `BAD_ADMIN_PASSCODE`, `SELF_MATCH`. If you add an RPC, follow this pattern and update both frontends' error maps.

---

## 5. app.js orientation (main file, ~750 lines, one IIFE)

- **API layer**: `makeSupabaseApi()` / `makeDemoApi()` — identical surface: `createProfile, login, updateProfile, sendRequest, respondRequest, sendMessage, fetchAll(myId), subscribe(onChange), unsubscribe()`. Keep them in lockstep if you change one.
- **State**: single `state` object (me, code, profiles, requests, matches, messages, openMatchId, knownMatchIds, currentScreen, obStep). Session persists in localStorage `yolink_session`; per-user read markers in `yolink_lastread_<profileId>`.
- **Refresh model**: realtime events (or storage events in demo) → `scheduleRefresh()` (250ms debounce) → `refreshAll()` re-fetches everything (fine at friends-and-family scale — do not prematurely optimize), diffs for new matches (→ celebration overlay) and new messages (→ toast), re-renders the active screen, updates badges.
- **Router**: `showScreen(name)` toggles `.screen.active`; nav visible only for discover/requests/matches/profile. Chat is a full-height screen with its own header.
- **Rendering**: string-template renderers per screen (`renderDiscover`, `renderRequests`, `renderMatches`, `renderChatMessages`, `renderProfileScreen`). **Every piece of user-generated text goes through `esc()` — maintain this invariant.**

---

## 6. Design system (Hinge-inspired — keep it consistent)

Tokens in `styles.css` `:root` (admin.html inlines the same values):
- Background `#faf8f5` (warm paper), ink `#21201f`, muted `#8a8580`, border `#eae5df`
- Primary accent: plum `#3a1b3f` (hover `#552a5c`); coffee accent `#a4693a` on `#f6efe8`
- Display type: **Georgia serif** for names, screen titles, prompt answers, chat "matched" banner. Sans (system stack) for everything else.
- Shapes: cards radius 20px with soft double shadow; buttons are 999px pills; inputs radius 12px.
- The signature element: **prompt blocks** — 11.5px uppercase letter-spaced gray label over 19px serif answer.
- Avatars: monogram circles, background from `profile.avatar_color` (palette of 8 in `AVATAR_COLORS`, assigned randomly at signup).
- Mobile-first, `#app` max-width 480px; desktop gets a centered column on darker backdrop. Admin page is desktop-first (~960px).

---

## 7. Current status

### Done and verified (2026-07-10, demo mode, driven in-browser)
- Onboarding → secret code → Discover; login incl. lowercase code normalization; wrong code shows friendly error
- Coffee-chat request → recipient badge → accept → match overlay → two-way chat with correct bubble sides
- Live cross-tab message delivery (storage-event path, same code path as realtime)
- Mutual pending requests auto-match with overlay
- Injected staff-source match pops "The Yolink team thinks you and X should talk" overlay live mid-session
- Unread badges set and clear correctly; matched/requested users filtered/flagged in Discover
- admin.html shows "not configured" notice without Supabase; RPC wiring + escaping code-reviewed
- Zero console errors throughout; design tokens confirmed applied via computed styles

### NOT yet done / verified
1. **No Supabase project exists yet.** Matt must create it, edit the `CHANGE_ME_STAFF_PASSCODE` line in `supabase/schema.sql`, run the file in the SQL Editor, and paste URL + anon key into `config.js`. Until then everything is demo mode.
2. **`schema.sql` has never run against a real database.** It was written carefully but expect the possibility of small SQL fixes on first run.
3. **Real-backend E2E untested**: `admin_match` round-trip, Supabase Realtime delivery across devices, RLS behavior in anger.
4. **Not deployed.** Deploy = `vercel` from the folder (Matt's CLI is linked; new project will be created). Any static host works.
5. **Not a git repo.** Consider `git init` + first commit before further changes.
6. Visual QA was done via computed styles + DOM, not screenshots (the session's browser-pane capture was broken). A human eyeball pass on the UI is worthwhile.

### Known quirks / conscious choices
- Two tabs in the SAME browser share one session (localStorage) — you can't be two users at once in one browser profile; demo-mode multi-user testing is done by logging out/in with codes.
- "They passed for now": if someone passes your request, your Discover card for them shows that state; you cannot re-request (unique constraint). Deliberate anti-spam choice.
- `refreshAll()` refetches all tables on every event — fine for dozens of users, revisit if the pool grows.
- Messages readable by anyone with the anon key (see §3). README tells users not to treat chats as private.

---

## 8. How to run and test

```
npx -y serve -l 4173 .        # from the yolink folder, then open http://localhost:4173
```
No build step. Demo-mode test recipe: create a profile → note the code → log out → log in as `YO-DEMO-0003` (Priya) → accept your request → chat. Admin: open `/admin.html` (needs real Supabase).

**When Supabase creds arrive, the priority task is the real-backend E2E:** run schema.sql, fill config.js, then repeat the full two-user flow on two devices/browsers + the admin match flow, and only then deploy.

---

## 9. Contingency plan: if Supabase is unavailable (VPN / regional blocking)

If Matt or his testers can't reach Supabase reliably (VPN issues, regional blocking, sustained outage), here is exactly what depends on it and how to replace each piece. **Test reachability first** — from the testers' actual network, not just Matt's — before committing to a swap: load `https://<project-ref>.supabase.co/rest/v1/` and hold a WebSocket open for a few minutes. Slow-but-reachable may only need the polling fallback (see 9d), not a full migration.

### What Supabase provides (4 distinct services bundled in one)

| # | Service | Where it's used | What breaks without it |
|---|---|---|---|
| 1 | **Postgres database** (tables in `supabase/schema.sql`) | All persistent data: profiles, secrets, requests, matches, messages | Everything except demo mode |
| 2 | **RPC layer** (PostgREST calling SECURITY DEFINER functions) | All writes — `sb.rpc(...)` calls in `app.js` and `admin.html` | Profile creation, requests, matching, messaging, admin tool |
| 3 | **Auto REST reads** (PostgREST `sb.from(...).select()`) | `fetchAll()` in app.js; profile/match lists in admin.html | Discover feed, requests list, match list, message history |
| 4 | **Realtime** (WebSocket change feed) | `subscribe()` in app.js — live chat, live match/request notifications | Hinge-style instant delivery (app still works with manual refresh) |

**NOT affected:** the entire frontend (index.html/styles.css/app.js UI code), admin.html's UI, Vercel hosting, and demo mode — all verified working with zero backend.

### The swap surface is deliberately small

`app.js` talks to the backend only through the object returned by `makeSupabaseApi()`. A replacement backend must implement the same 10-method interface (see `makeDemoApi()` for a working reference implementation with identical semantics, including the mutual-request auto-match and error tokens):

```
createProfile, login, updateProfile, sendRequest, respondRequest,
sendMessage, fetchAll(myId), subscribe(onChange), unsubscribe(), demo
```

Write a third `make<Provider>Api()` and switch on config — the UI needs zero changes. `admin.html` additionally needs its ~4 call sites replaced (`admin_check`, `admin_match`, profiles select, matches select).

### Replacement options per service

**9a. Database + write-gating logic (replaces #1 + #2)** — these move together; the secret-code validation MUST live server-side, never in the browser.

| Option | What it is | Effort / notes |
|---|---|---|
| **Vercel Functions + Neon Postgres** (recommended default) | `api/*.js` serverless functions on the existing Vercel deploy; each RPC becomes one endpoint; Neon is serverless Postgres with a free tier | Best schema reuse — tables and most SQL in `schema.sql` port nearly as-is; the plpgsql functions become ~8 small JS handlers (AI-buildable in one session). Same-origin `/api/*` avoids new domains for blocked-region testers |
| **PocketBase on a small VPS** | Single-binary backend (SQLite + REST + realtime + rules), self-hosted | One service replaces ALL FOUR rows of the table above. Pick a VPS region reachable by testers (this is the reliable route if the audience is behind a national firewall, where Firebase/Google is blocked too). Needs schema re-modeling from SQL to PocketBase collections + JS hooks for the RPC logic |
| **Firebase (Firestore + Cloud Functions)** | Google's equivalent BaaS | Viable, but ⚠ Google is blocked in the same regions where Supabase VPN problems are commonly reported (e.g. mainland China) — verify testers can reach it before choosing |

**9b. Reads (replaces #3):** falls out of 9a automatically — add a `GET /api/state?me=<id>` endpoint (Vercel Functions route) or use the provider's native queries (PocketBase/Firestore). Mirror `fetchAll()`'s shape: `{profiles, requests, matches, messages}`.

**9c. Instant messaging / realtime (replaces #4)** — this is the piece Matt correctly flagged as "a Supabase service":

| Option | Notes |
|---|---|
| **Polling (recommended for Phase 1)** | Call `fetchAll()` every 3–5 seconds instead of `subscribe()`. ~15 lines: `setInterval(scheduleRefresh, 4000)` inside `subscribe()`. At friends-and-family scale this is indistinguishable from realtime in practice, costs nothing, works through any firewall that allows plain HTTPS, and reuses the already-verified refresh path (`scheduleRefresh → refreshAll`). Build this first; upgrade later only if the delay is actually felt |
| **Ably / Pusher (free tiers)** | Hosted pub/sub WebSockets. Server endpoint publishes on every write; app.js `subscribe()` becomes a channel listener. Adds a vendor + key management for marginal MVP gain |
| **PocketBase / Firebase native realtime** | Included if 9a chose one of those — no extra service |
| **Self-built WebSocket server** | Not worth it for an MVP; polling beats it on effort/reliability |

### Recommended fallback stacks (pick one)

- **Plan B (least new concepts):** Vercel Functions + Neon Postgres + polling. Keeps SQL, keeps Vercel, no new vendors for testers to reach beyond Neon's endpoint (which only the serverless functions talk to — testers never touch it directly, so regional blocking of the DB host doesn't matter).
- **Plan C (testers behind a national firewall):** PocketBase on a VPS hosted in/near the testers' region, serving both API and realtime; keep the static frontend on Vercel or move it to the same VPS.

### Migration checklist for whichever agent executes this

1. Confirm with Matt which networks/regions must work — this decides Plan B vs C.
2. Build the new `make<X>Api()` against the 10-method interface; port the demo-mode seed data as test fixtures.
3. Preserve the error-token contract (§4) so all existing UI error handling keeps working.
4. Re-run the §8 verification recipe end-to-end, including the admin match flow, on the new backend.
5. Update `config.js`, `README.md` setup section, and §3/§7 of this document. Do not delete `supabase/schema.sql` — it remains the authoritative statement of the data model and business rules.

## 10. Working agreements (from the owner's session)

- Ask before adding accounts/services; the owner must create accounts and provide credentials himself.
- Keep it lightweight: no frameworks, no build tooling, single-purpose files.
- Subagent pattern used in the build: tightly-coupled core (schema/app/design) in the main session; self-contained pieces (admin.html, README) delegated with the RPC contract + design tokens as the brief.
- Matt is a PM: explain tradeoffs in product terms, keep setup steps ~5 minutes.
