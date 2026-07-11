# Yolink

Yolink is a friends-and-family MVP of a Hinge-inspired professional networking app. Members create a lightweight profile, browse other members, and send a "Let's network" or "Coffee chat" request; when two people are interested in each other a match opens a chat. It's a trusted-pool tool, not a public product — see the security section before sharing it widely.

## File map

| File | What it is |
|---|---|
| `index.html` / `app.js` | The member-facing app (browse, request, match, chat). |
| `styles.css` | Shared design system (colors, type, components) used by the member app. |
| `config.js` | Where you paste your Supabase project URL and anon key. |
| `supabase/schema.sql` | Full database schema, security rules, and all backend logic (run once in Supabase). |
| `admin.html` | Standalone staff tool for manually matching members. Not linked from the app — bookmark it. |

## One-time setup (~5 minutes)

1. **Create a free Supabase project** at [supabase.com](https://supabase.com) (the free tier is plenty for a friends-and-family group).
2. **Set the staff passcode.** Open `supabase/schema.sql`, find the line near the top that says:
   ```
   values ('admin_passcode', 'CHANGE_ME_STAFF_PASSCODE')
   ```
   and replace `CHANGE_ME_STAFF_PASSCODE` with a passcode you'll remember (this is what unlocks `admin.html`).
3. **Run the schema.** In your Supabase project, open **SQL Editor**, paste the entire contents of `supabase/schema.sql`, and click **Run**. This creates all the tables, locks them down with row-level security, and installs the backend functions the app calls.
4. **Connect the app.** In Supabase, go to **Settings → API** and copy the **Project URL** and the **anon public key**. Paste them into `config.js`:
   ```js
   window.YOLINK_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJ...",
   };
   ```

Until you do this, `config.js` keeps its placeholder values and the app runs in **demo mode** — everything is stored in `localStorage` in a single browser, so you (or anyone) can try the full flow with no backend at all. `admin.html` will show a "Supabase not configured yet" notice instead of loading in this state.

## Deploy

Yolink is a static site — no build step, no server to run. From the project folder:

```
vercel
```

(Install the CLI first with `npm i -g vercel` if needed, and follow the prompts.) Alternatively, drag-and-drop the whole folder onto [vercel.com/new](https://vercel.com/new). Any static host works — Netlify, GitHub Pages, S3, etc.

## How members use it

1. **Create a profile** — name, title, company, industry, years of experience, and two Hinge-style prompts ("my background is in…" / "I'm looking to network with…").
2. **Save the secret code** shown right after — it's a short code like `YO-7F3K-QM2X`, and it's the *only* way to get back into that profile later. There's no email/password login.
3. **Browse Discover** and send a **"Let's network"** or **"Coffee chat"** request to people who look interesting.
4. **The other person accepts (or passes)** from their Requests screen.
5. If two people send each other pending requests, they're matched automatically — no one has to accept anything. Otherwise, once a request is accepted, a **match** is created and a **chat** opens for both people instantly.

## Staff manual matching

Sometimes you'll want to hand-pair two people yourself (e.g. from an in-person event or an Excel list of intros to make):

1. Open `admin.html` directly — it's intentionally not linked anywhere in the member app, so bookmark the URL.
2. Enter the staff passcode you set in step 2 of setup.
3. Search for **Member A** and **Member B** by name (or paste a member's id) and pick each from the results.
4. Click **Create Match**. Both members will instantly see "You matched" and a chat opens for them — same as a mutual match.
5. The **member directory** table has a **Copy ID** button on every row, handy for pasting into an Excel tracking sheet. Creating a match that already exists is harmless — it just returns the existing match.

## Security tradeoffs (be honest with yourself here)

This is built for a small, trusted pool of friends and family, not the general public:

- **Anyone who views the page source can read the anon key**, and with it, can read *all* profiles, requests, matches, and messages — the anon key has open read access to those tables. There's no per-user read restriction.
- **Writes are gated**, not open: creating/editing a profile, sending requests, and sending messages all require a member's secret code; manual matching requires the staff passcode. The anon key alone can't write anything.
- **There's no real authentication.** A secret code is a shared secret, not a login system — if someone else gets your code, they can act as you.
- **A lost secret code means a lost profile** for that member, from their side. Staff can look codes up in the Supabase dashboard, in the `profile_secrets` table (Table Editor → `profile_secrets`), and pass them along.
- Because of all this, **don't use Yolink for sensitive conversations** — treat it like a lightweight intro tool, not a private messenger.

## Phase 2 ideas

- Real authentication (Supabase magic-link email login) instead of secret codes.
- Interest-based auto-matching (beyond mutual requests / staff picks).
- Profile photo upload.
- Notifications (email or push) when someone sends a request or you get matched.
