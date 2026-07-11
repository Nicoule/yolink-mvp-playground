/* ============================================================
   Yolink — app logic
   Runs against Supabase when config.js is filled in, otherwise
   falls back to a localStorage "demo mode" with the same API
   surface so the whole flow works without a backend.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Utilities ----------
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function initials(name) {
    const words = String(name || "?").trim().split(/\s+/);
    const first = words[0]?.[0] || "?";
    const last = words.length > 1 ? words[words.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const AVATAR_COLORS = ["#3a1b3f", "#7a3b69", "#a4693a", "#2e5d7d", "#2e7d5b", "#8a4b2f", "#4b4e8a", "#815a2b"];

  const ERROR_MESSAGES = {
    INVALID_CODE: "That code didn't match any profile. Check it and try again.",
    ALREADY_REQUESTED: "You already sent them a request — hang tight!",
    ALREADY_MATCHED: "You're already matched with them.",
    SELF_REQUEST: "That's you!",
    NOT_YOUR_REQUEST: "This request isn't yours to answer.",
    ALREADY_HANDLED: "This request was already answered.",
    NOT_YOUR_MATCH: "You're not part of this conversation.",
  };
  function friendlyError(err) {
    const msg = err?.message || String(err);
    for (const key of Object.keys(ERROR_MESSAGES)) {
      if (msg.includes(key)) return ERROR_MESSAGES[key];
    }
    return "Something went wrong. Please try again.";
  }

  let toastTimer = null;
  function toast(text, isMatch) {
    const el = $("toast");
    el.textContent = text;
    el.classList.toggle("match", !!isMatch);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function copyText(text, doneMsg) {
    navigator.clipboard?.writeText(text).then(
      () => toast(doneMsg || "Copied!"),
      () => toast("Couldn't copy — select it manually.")
    );
  }

  // ---------- API layer ----------
  const cfg = window.YOLINK_CONFIG || {};
  const DEMO_MODE = !cfg.SUPABASE_URL || cfg.SUPABASE_URL === "YOUR_SUPABASE_URL";

  // --- Real backend: Supabase ---
  function makeSupabaseApi() {
    const sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    let channel = null;

    async function rpc(name, args) {
      const { data, error } = await sb.rpc(name, args);
      if (error) throw error;
      return data;
    }

    return {
      demo: false,
      createProfile: (f) => rpc("create_profile", {
        p_name: f.name, p_title: f.title, p_company: f.company, p_industry: f.industry,
        p_years_exp: f.years_exp, p_background: f.background, p_looking_for: f.looking_for,
        p_avatar_color: f.avatar_color,
      }),
      login: (code) => rpc("login", { p_code: code }),
      updateProfile: (code, f) => rpc("update_profile", {
        p_code: code, p_name: f.name, p_title: f.title, p_company: f.company,
        p_industry: f.industry, p_years_exp: f.years_exp,
        p_background: f.background, p_looking_for: f.looking_for,
      }),
      sendRequest: (code, toId, kind) => rpc("send_request", { p_code: code, p_to_id: toId, p_kind: kind }),
      respondRequest: (code, reqId, accept) => rpc("respond_request", { p_code: code, p_request_id: reqId, p_accept: accept }),
      sendMessage: (code, matchId, body) => rpc("send_message", { p_code: code, p_match_id: matchId, p_body: body }),

      async fetchAll(myId) {
        const [profiles, requests, matches] = await Promise.all([
          sb.from("profiles").select("*").order("created_at", { ascending: false }),
          sb.from("requests").select("*"),
          sb.from("matches").select("*"),
        ]);
        for (const r of [profiles, requests, matches]) if (r.error) throw r.error;
        const myMatches = matches.data.filter((m) => m.user_a === myId || m.user_b === myId);
        let messages = [];
        if (myMatches.length) {
          const res = await sb.from("messages").select("*")
            .in("match_id", myMatches.map((m) => m.id))
            .order("created_at", { ascending: true });
          if (res.error) throw res.error;
          messages = res.data;
        }
        return { profiles: profiles.data, requests: requests.data, matches: matches.data, messages };
      },

      subscribe(onChange) {
        channel = sb.channel("yolink-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, onChange)
          .subscribe();
      },
      unsubscribe() {
        if (channel) { sb.removeChannel(channel); channel = null; }
      },
    };
  }

  // --- Demo backend: localStorage (single browser, cross-tab) ---
  function makeDemoApi() {
    const KEY = "yolink_demo_db";
    const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
      "xxxx-xxxx-4xxx-yxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }));

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
    }
    function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

    function seed() {
      const db = { profiles: [], secrets: {}, requests: [], matches: [], messages: [], msgSeq: 1 };
      const samples = [
        { name: "Ana Torres", title: "Engineering Manager", company: "Northwind", industry: "Technology",
          years_exp: 9, background: "Backend infrastructure and platform teams — I've scaled systems and engineers at two startups.",
          looking_for: "PMs and designers curious about how engineering orgs really work — happy to demystify." },
        { name: "Marcus Lee", title: "Financial Analyst", company: "Harbor Capital", industry: "Finance",
          years_exp: 4, background: "Equity research covering consumer tech. Excel is my second language.",
          looking_for: "Operators inside tech companies — I want the view from the ground, not the earnings call." },
        { name: "Priya Nair", title: "Clinical Product Lead", company: "Medlia Health", industry: "Healthcare",
          years_exp: 12, background: "Nursing informatics, then a decade building clinician-facing software.",
          looking_for: "People moving into health tech from other industries — I love helping with that jump." },
      ];
      samples.forEach((s, i) => {
        const id = uuid();
        db.profiles.push({ id, ...s, avatar_color: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length],
          created_at: new Date(Date.now() - (i + 1) * 864e5).toISOString() });
        db.secrets["YO-DEMO-" + String(i + 1).padStart(4, "0")] = id;
      });
      save(db);
      return db;
    }

    function db() { return load() || seed(); }

    function genCode() {
      const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
      return "YO-" + [1, 2, 3, 4].map(pick).join("") + "-" + [1, 2, 3, 4].map(pick).join("");
    }

    function auth(d, code) {
      const id = d.secrets[String(code || "").trim().toUpperCase()];
      if (!id) throw new Error("INVALID_CODE");
      return id;
    }

    function makeMatch(d, u1, u2, source) {
      const [a, b] = [u1, u2].sort();
      let m = d.matches.find((x) => x.user_a === a && x.user_b === b);
      if (!m) {
        m = { id: uuid(), user_a: a, user_b: b, source, created_at: new Date().toISOString() };
        d.matches.push(m);
      }
      return m.id;
    }

    const delay = (v) => new Promise((res) => setTimeout(() => res(v), 120));

    return {
      demo: true,
      async createProfile(f) {
        const d = db();
        const profile = { id: uuid(), name: f.name, title: f.title, company: f.company || null,
          industry: f.industry, years_exp: f.years_exp, background: f.background,
          looking_for: f.looking_for, avatar_color: f.avatar_color, created_at: new Date().toISOString() };
        d.profiles.unshift(profile);
        const code = genCode();
        d.secrets[code] = profile.id;
        save(d);
        return delay({ profile, secret_code: code });
      },
      async login(code) {
        const d = db();
        const id = auth(d, code);
        return delay(d.profiles.find((p) => p.id === id));
      },
      async updateProfile(code, f) {
        const d = db();
        const id = auth(d, code);
        const p = d.profiles.find((x) => x.id === id);
        Object.assign(p, { name: f.name, title: f.title, company: f.company || null,
          industry: f.industry, years_exp: f.years_exp, background: f.background, looking_for: f.looking_for });
        save(d);
        return delay(p);
      },
      async sendRequest(code, toId, kind) {
        const d = db();
        const from = auth(d, code);
        if (from === toId) throw new Error("SELF_REQUEST");
        const [a, b] = [from, toId].sort();
        if (d.matches.some((m) => m.user_a === a && m.user_b === b)) throw new Error("ALREADY_MATCHED");
        if (d.requests.some((r) => r.from_id === from && r.to_id === toId)) throw new Error("ALREADY_REQUESTED");
        const reverse = d.requests.find((r) => r.from_id === toId && r.to_id === from && r.status === "pending");
        if (reverse) {
          reverse.status = "accepted";
          const matchId = makeMatch(d, from, toId, "mutual");
          save(d);
          return delay({ matched: true, match_id: matchId });
        }
        d.requests.push({ id: uuid(), from_id: from, to_id: toId, kind, status: "pending", created_at: new Date().toISOString() });
        save(d);
        return delay({ matched: false });
      },
      async respondRequest(code, reqId, accept) {
        const d = db();
        const me = auth(d, code);
        const req = d.requests.find((r) => r.id === reqId);
        if (!req || req.to_id !== me) throw new Error("NOT_YOUR_REQUEST");
        if (req.status !== "pending") throw new Error("ALREADY_HANDLED");
        req.status = accept ? "accepted" : "passed";
        let matchId = null;
        if (accept) matchId = makeMatch(d, req.from_id, req.to_id, "mutual");
        save(d);
        return delay({ matched: !!accept, match_id: matchId });
      },
      async sendMessage(code, matchId, body) {
        const d = db();
        const me = auth(d, code);
        const m = d.matches.find((x) => x.id === matchId);
        if (!m || (m.user_a !== me && m.user_b !== me)) throw new Error("NOT_YOUR_MATCH");
        const msg = { id: d.msgSeq++, match_id: matchId, sender_id: me, body: body.trim(), created_at: new Date().toISOString() };
        d.messages.push(msg);
        save(d);
        return delay(msg);
      },
      async fetchAll(myId) {
        const d = db();
        const myMatchIds = new Set(d.matches.filter((m) => m.user_a === myId || m.user_b === myId).map((m) => m.id));
        return delay({
          profiles: [...d.profiles],
          requests: [...d.requests],
          matches: [...d.matches],
          messages: d.messages.filter((m) => myMatchIds.has(m.match_id)),
        });
      },
      subscribe(onChange) {
        this._handler = (e) => { if (e.key === KEY) onChange(); };
        window.addEventListener("storage", this._handler);
      },
      unsubscribe() {
        if (this._handler) window.removeEventListener("storage", this._handler);
      },
    };
  }

  const api = DEMO_MODE ? makeDemoApi() : makeSupabaseApi();

  // ---------- State ----------
  const SESSION_KEY = "yolink_session";
  const state = {
    me: null,            // my profile row
    code: null,          // my secret code
    profiles: [],
    requests: [],
    matches: [],
    messages: [],
    openMatchId: null,   // chat currently open
    knownMatchIds: null, // for detecting new matches (null until first load)
    currentScreen: "welcome",
    obStep: 1,
  };

  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function saveSession(code, profile) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ code, profile }));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  // last-read timestamps per match (for unread badges), per profile
  function lastReadMap() {
    if (!state.me) return {};
    try { return JSON.parse(localStorage.getItem("yolink_lastread_" + state.me.id)) || {}; } catch { return {}; }
  }
  function markRead(matchId) {
    if (!state.me) return;
    const map = lastReadMap();
    map[matchId] = new Date().toISOString();
    localStorage.setItem("yolink_lastread_" + state.me.id, JSON.stringify(map));
  }

  // ---------- Derived data helpers ----------
  const profileById = (id) => state.profiles.find((p) => p.id === id);
  const myMatches = () => state.matches.filter((m) => state.me && (m.user_a === state.me.id || m.user_b === state.me.id));
  const matchPartner = (m) => profileById(m.user_a === state.me.id ? m.user_b : m.user_a);
  const incomingRequests = () => state.requests.filter((r) => r.to_id === state.me?.id && r.status === "pending");
  const outgoingRequests = () => state.requests.filter((r) => r.from_id === state.me?.id && r.status === "pending");
  const messagesFor = (matchId) => state.messages.filter((m) => m.match_id === matchId);

  function unreadCount(matchId) {
    const last = lastReadMap()[matchId];
    return messagesFor(matchId).filter(
      (m) => m.sender_id !== state.me.id && (!last || m.created_at > last)
    ).length;
  }

  // ---------- Router ----------
  const NAV_SCREENS = ["discover", "requests", "matches", "profile"];
  function showScreen(name) {
    state.currentScreen = name;
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    const nav = $("bottom-nav");
    nav.classList.toggle("visible", NAV_SCREENS.includes(name));
    document.querySelectorAll(".nav-btn").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.screen === name)
    );
    if (name !== "chat") state.openMatchId = null;
    window.scrollTo(0, 0);
    const renderers = { discover: renderDiscover, requests: renderRequests, matches: renderMatches, profile: renderProfileScreen };
    renderers[name]?.();
    updateBadges();
  }

  // ---------- Shared render bits ----------
  function avatarHtml(profile, size) {
    return `<div class="avatar ${size}" style="background:${esc(profile.avatar_color)}">${esc(initials(profile.name))}</div>`;
  }

  function profileCardHtml(p, actionsHtml, bannerHtml) {
    const company = p.company ? ` <span style="opacity:.75">@ ${esc(p.company)}</span>` : "";
    return `
      <div class="card">
        ${bannerHtml || ""}
        <div class="pcard-head" style="background:linear-gradient(135deg, ${esc(p.avatar_color)}, ${esc(p.avatar_color)}cc)">
          ${avatarHtml(p, "lg")}
          <div style="min-width:0">
            <h2 class="pcard-name">${esc(p.name)}</h2>
            <p class="pcard-title">${esc(p.title)}${company}</p>
          </div>
        </div>
        <div class="pcard-body">
          <div class="chips">
            <span class="chip">${esc(p.industry)}</span>
            <span class="chip">${esc(String(p.years_exp))} yr${p.years_exp === 1 ? "" : "s"} experience</span>
          </div>
          <div class="prompt">
            <div class="prompt-label">My background is in…</div>
            <div class="prompt-answer">${esc(p.background)}</div>
          </div>
          <div class="prompt">
            <div class="prompt-label">I'm looking to network with…</div>
            <div class="prompt-answer">${esc(p.looking_for)}</div>
          </div>
        </div>
        ${actionsHtml || ""}
      </div>`;
  }

  function emptyStateHtml(glyph, title, sub) {
    return `<div class="empty-state"><div class="glyph">${glyph}</div><div class="title">${esc(title)}</div><div>${esc(sub)}</div></div>`;
  }

  // ---------- Discover ----------
  function renderDiscover() {
    $("demo-banner-slot").innerHTML = api.demo
      ? `<div class="demo-banner">Demo mode — data lives only in this browser. Add your Supabase keys in config.js to go live.</div>`
      : "";

    const matchedIds = new Set(myMatches().flatMap((m) => [m.user_a, m.user_b]));
    const myOutgoing = new Map(
      state.requests.filter((r) => r.from_id === state.me.id).map((r) => [r.to_id, r])
    );

    const pool = state.profiles.filter((p) => p.id !== state.me.id && !matchedIds.has(p.id));
    if (!pool.length) {
      $("discover-list").innerHTML = emptyStateHtml("🌱", "The pool is warming up",
        "No one else here yet — invite a few friends to create profiles.");
      return;
    }

    $("discover-list").innerHTML = pool.map((p) => {
      const existing = myOutgoing.get(p.id);
      let actions;
      if (existing) {
        const label = existing.status === "passed" ? "They passed for now" : "Requested ✓";
        actions = `<div class="pcard-actions"><button class="btn requested full" disabled>${label}</button></div>`;
      } else {
        actions = `
          <div class="pcard-actions">
            <button class="btn" data-request="network" data-to="${esc(p.id)}">🤝 Let's network</button>
            <button class="btn coffee" data-request="coffee" data-to="${esc(p.id)}">☕ Coffee chat</button>
          </div>`;
      }
      return profileCardHtml(p, actions);
    }).join("");

    $("discover-list").querySelectorAll("[data-request]").forEach((btn) => {
      btn.addEventListener("click", () => sendRequestClick(btn.dataset.to, btn.dataset.request, btn));
    });
  }

  async function sendRequestClick(toId, kind, btn) {
    btn.disabled = true;
    try {
      const result = await api.sendRequest(state.code, toId, kind);
      if (result.matched) {
        await refreshAll({ silent: true });
        showMatchOverlay(result.match_id);
      } else {
        toast(kind === "coffee" ? "Coffee chat requested ☕" : "Request sent 🤝");
        await refreshAll({ silent: true });
      }
      if (state.currentScreen === "discover") renderDiscover();
    } catch (err) {
      toast(friendlyError(err));
      btn.disabled = false;
    }
  }

  // ---------- Requests ----------
  function renderRequests() {
    const incoming = incomingRequests();
    const kindText = (k) => (k === "coffee" ? "wants to grab a coffee with you" : "wants to network with you");

    $("requests-incoming").innerHTML = !incoming.length
      ? emptyStateHtml("💌", "No requests yet", "When someone wants to connect with you, they'll show up here.")
      : incoming.map((r) => {
          const p = profileById(r.from_id);
          if (!p) return "";
          const banner = `<div class="req-kind-banner ${r.kind === "coffee" ? "coffee" : ""}">
              ${r.kind === "coffee" ? "☕" : "🤝"} ${esc(p.name.split(" ")[0])} ${kindText(r.kind)}
            </div>`;
          const actions = `
            <div class="pcard-actions">
              <button class="btn" data-respond="accept" data-req="${esc(r.id)}">Accept</button>
              <button class="btn secondary" data-respond="pass" data-req="${esc(r.id)}">Pass</button>
            </div>`;
          return profileCardHtml(p, actions, banner);
        }).join("");

    const outgoing = outgoingRequests();
    $("requests-outgoing").innerHTML = !outgoing.length ? "" :
      `<div class="section-label">Sent by you</div>` +
      outgoing.map((r) => {
        const p = profileById(r.to_id);
        if (!p) return "";
        return `
          <div class="outgoing-row">
            ${avatarHtml(p, "sm")}
            <div class="meta">
              <div class="name">${esc(p.name)}</div>
              <div class="sub">${r.kind === "coffee" ? "☕ Coffee chat" : "🤝 Let's network"} · ${esc(fmtTime(r.created_at))}</div>
            </div>
            <span class="status-pill">Pending</span>
          </div>`;
      }).join("");

    $("requests-incoming").querySelectorAll("[data-respond]").forEach((btn) => {
      btn.addEventListener("click", () => respondClick(btn.dataset.req, btn.dataset.respond === "accept", btn));
    });
  }

  async function respondClick(reqId, accept, btn) {
    btn.disabled = true;
    try {
      const result = await api.respondRequest(state.code, reqId, accept);
      await refreshAll({ silent: true });
      if (result.matched) showMatchOverlay(result.match_id);
      else toast("Passed — no hard feelings.");
      if (state.currentScreen === "requests") renderRequests();
    } catch (err) {
      toast(friendlyError(err));
      btn.disabled = false;
    }
  }

  // ---------- Matches ----------
  function renderMatches() {
    const list = myMatches()
      .slice()
      .sort((a, b) => {
        const la = messagesFor(a.id).at(-1)?.created_at || a.created_at;
        const lb = messagesFor(b.id).at(-1)?.created_at || b.created_at;
        return lb.localeCompare(la);
      });

    if (!list.length) {
      $("matches-list").innerHTML = emptyStateHtml("✨", "No matches yet",
        "Accept a request or get matched by our team, and your conversations will live here.");
      return;
    }

    $("matches-list").innerHTML = list.map((m) => {
      const p = matchPartner(m);
      if (!p) return "";
      const msgs = messagesFor(m.id);
      const last = msgs.at(-1);
      const unread = unreadCount(m.id);
      const preview = last
        ? `${last.sender_id === state.me.id ? "You: " : ""}${esc(last.body)}`
        : (m.source === "staff" ? "Matched by the Yolink team — say hello!" : "You matched — say hello!");
      const right = !last
        ? `<span class="new-tag">NEW</span>`
        : unread > 0 ? `<span class="unread-dot" title="${unread} unread"></span>` : "";
      return `
        <div class="match-row" data-open="${esc(m.id)}">
          ${avatarHtml(p, "md")}
          <div class="meta">
            <div class="name">${esc(p.name)}</div>
            <div class="preview">${preview}</div>
          </div>
          ${right}
        </div>`;
    }).join("");

    $("matches-list").querySelectorAll("[data-open]").forEach((row) => {
      row.addEventListener("click", () => openChat(row.dataset.open));
    });
  }

  // ---------- Chat ----------
  function openChat(matchId) {
    const m = state.matches.find((x) => x.id === matchId);
    const p = m && matchPartner(m);
    if (!p) return;
    state.openMatchId = matchId;
    $("chat-avatar").outerHTML = avatarHtml(p, "sm").replace('class="avatar sm"', 'class="avatar sm" id="chat-avatar"');
    $("chat-name").textContent = p.name;
    $("chat-sub").textContent = p.title + (p.company ? " @ " + p.company : "");
    showScreen("chat");
    renderChatMessages();
    markRead(matchId);
    updateBadges();
    $("chat-input").focus();
  }

  function renderChatMessages() {
    const m = state.matches.find((x) => x.id === state.openMatchId);
    if (!m) return;
    const p = matchPartner(m);
    const msgs = messagesFor(m.id);
    const banner = `
      <div class="matched-banner">
        <span class="big">🎉</span>
        You matched with ${esc(p.name.split(" ")[0])}
        <div class="sub">${m.source === "staff" ? "Hand-picked by the Yolink team" : "You both wanted to connect"} · ${esc(fmtTime(m.created_at))}</div>
      </div>`;
    let html = banner;
    let prevMine = null;
    for (const msg of msgs) {
      const mine = msg.sender_id === state.me.id;
      if (prevMine !== mine) html += `<div class="bubble-time ${mine ? "mine" : "theirs"}">${esc(fmtTime(msg.created_at))}</div>`;
      html += `<div class="bubble ${mine ? "mine" : "theirs"}">${esc(msg.body)}</div>`;
      prevMine = mine;
    }
    const box = $("chat-messages");
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  async function sendChatMessage(ev) {
    ev.preventDefault();
    const input = $("chat-input");
    const body = input.value.trim();
    if (!body || !state.openMatchId) return;
    input.value = "";
    try {
      const msg = await api.sendMessage(state.code, state.openMatchId, body);
      state.messages.push(msg);
      renderChatMessages();
      markRead(state.openMatchId);
    } catch (err) {
      input.value = body;
      toast(friendlyError(err));
    }
  }

  // ---------- Profile ----------
  function renderProfileScreen() {
    $("profile-preview").innerHTML = profileCardHtml(state.me);
    $("profile-code").textContent = state.code;
    $("pf-name").value = state.me.name;
    $("pf-title").value = state.me.title;
    $("pf-company").value = state.me.company || "";
    $("pf-industry").value = state.me.industry;
    $("pf-years").value = state.me.years_exp;
    $("pf-background").value = state.me.background;
    $("pf-looking").value = state.me.looking_for;
  }

  async function saveProfile() {
    const err = $("pf-error");
    err.classList.remove("visible");
    const fields = collectProfileFields("pf");
    if (fields.error) {
      err.textContent = fields.error;
      err.classList.add("visible");
      return;
    }
    try {
      const updated = await api.updateProfile(state.code, fields);
      state.me = updated;
      saveSession(state.code, updated);
      const idx = state.profiles.findIndex((p) => p.id === updated.id);
      if (idx >= 0) state.profiles[idx] = updated;
      renderProfileScreen();
      toast("Profile saved ✓");
    } catch (e) {
      err.textContent = friendlyError(e);
      err.classList.add("visible");
    }
  }

  function collectProfileFields(prefix) {
    const get = (f) => $(prefix + "-" + f).value.trim();
    const name = get("name"), title = get("title"), company = get("company");
    const industry = get("industry"), background = get("background"), looking = get("looking");
    const years = parseInt($(prefix + "-years").value, 10);
    if (!name) return { error: "Please enter your name." };
    if (!title) return { error: "Please enter your job title." };
    if (!industry) return { error: "Please enter your industry." };
    if (Number.isNaN(years) || years < 0 || years > 60) return { error: "Years of experience should be between 0 and 60." };
    if (!background) return { error: "Tell people what your background is in." };
    if (!looking) return { error: "Tell people who you're looking to network with." };
    return { name, title, company, industry, years_exp: years, background, looking_for: looking };
  }

  // ---------- Onboarding ----------
  function showObStep(step) {
    state.obStep = step;
    [1, 2, 3].forEach((i) => { $("ob-step-" + i).style.display = i === step ? "" : "none"; });
    document.querySelectorAll("#ob-dots span").forEach((dot, i) => dot.classList.toggle("done", i < step));
    $("btn-ob-next").textContent = step === 3 ? "Create profile" : "Next";
    $("ob-error").classList.remove("visible");
  }

  async function obNext() {
    const err = $("ob-error");
    err.classList.remove("visible");
    const fail = (msg) => { err.textContent = msg; err.classList.add("visible"); };

    if (state.obStep === 1) {
      if (!$("ob-name").value.trim()) return fail("Please enter your name.");
      if (!$("ob-title").value.trim()) return fail("Please enter your job title.");
      return showObStep(2);
    }
    if (state.obStep === 2) {
      const years = parseInt($("ob-years").value, 10);
      if (!$("ob-industry").value.trim()) return fail("Please enter your industry.");
      if (Number.isNaN(years) || years < 0 || years > 60) return fail("Years of experience should be between 0 and 60.");
      return showObStep(3);
    }
    // step 3 -> create
    if (!$("ob-background").value.trim()) return fail("Tell people what your background is in.");
    if (!$("ob-looking").value.trim()) return fail("Tell people who you're looking to network with.");

    const btn = $("btn-ob-next");
    btn.disabled = true;
    try {
      const fields = {
        name: $("ob-name").value.trim(),
        title: $("ob-title").value.trim(),
        company: $("ob-company").value.trim() || null,
        industry: $("ob-industry").value.trim(),
        years_exp: parseInt($("ob-years").value, 10),
        background: $("ob-background").value.trim(),
        looking_for: $("ob-looking").value.trim(),
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      };
      const result = await api.createProfile(fields);
      state.me = result.profile;
      state.code = result.secret_code;
      saveSession(state.code, state.me);
      $("code-display").textContent = state.code;
      showScreen("code");
    } catch (e) {
      fail(friendlyError(e));
    } finally {
      btn.disabled = false;
    }
  }

  function obBack() {
    if (state.obStep > 1) showObStep(state.obStep - 1);
    else showScreen("welcome");
  }

  // ---------- Login / logout ----------
  async function doLogin() {
    const err = $("login-error");
    err.classList.remove("visible");
    const code = $("login-code").value.trim().toUpperCase();
    if (!code) return;
    const btn = $("btn-login");
    btn.disabled = true;
    try {
      const profile = await api.login(code);
      state.me = profile;
      state.code = code;
      saveSession(code, profile);
      await enterApp();
    } catch (e) {
      err.textContent = friendlyError(e);
      err.classList.add("visible");
    } finally {
      btn.disabled = false;
    }
  }

  function logout() {
    api.unsubscribe();
    clearSession();
    state.me = null;
    state.code = null;
    state.knownMatchIds = null;
    $("login-code").value = "";
    showScreen("welcome");
  }

  // ---------- Data refresh + realtime ----------
  let refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refreshAll(), 250);
  }

  async function refreshAll(opts = {}) {
    if (!state.me) return;
    let data;
    try {
      data = await api.fetchAll(state.me.id);
    } catch (e) {
      console.error("refresh failed", e);
      return;
    }
    const prevMatchIds = state.knownMatchIds;
    const prevMsgCount = state.messages.length;

    state.profiles = data.profiles;
    state.requests = data.requests;
    state.matches = data.matches;
    state.messages = data.messages;

    // keep my own profile fresh (e.g. edited in another tab)
    const mine = profileById(state.me.id);
    if (mine) state.me = mine;

    // detect brand-new matches involving me (skip on first load)
    const currentIds = new Set(myMatches().map((m) => m.id));
    if (prevMatchIds && !opts.silent) {
      for (const m of myMatches()) {
        if (!prevMatchIds.has(m.id)) {
          showMatchOverlay(m.id);
          break;
        }
      }
    }
    state.knownMatchIds = currentIds;

    // notify on new incoming messages when not looking at that chat
    if (!opts.silent && state.messages.length > prevMsgCount) {
      const fresh = state.messages.slice(prevMsgCount).filter(
        (m) => m.sender_id !== state.me.id && m.match_id !== state.openMatchId
      );
      if (fresh.length) {
        const sender = profileById(fresh.at(-1).sender_id);
        if (sender) toast(`💬 New message from ${sender.name.split(" ")[0]}`, true);
      }
    }

    // re-render whatever is on screen
    if (state.currentScreen === "chat" && state.openMatchId) {
      renderChatMessages();
      markRead(state.openMatchId);
    } else {
      const renderers = { discover: renderDiscover, requests: renderRequests, matches: renderMatches };
      renderers[state.currentScreen]?.();
    }
    updateBadges();
  }

  function updateBadges() {
    const reqBadge = $("badge-requests");
    const reqCount = state.me ? incomingRequests().length : 0;
    reqBadge.textContent = reqCount;
    reqBadge.classList.toggle("visible", reqCount > 0);

    const matchBadge = $("badge-matches");
    let unread = 0;
    if (state.me) for (const m of myMatches()) unread += unreadCount(m.id);
    matchBadge.textContent = unread;
    matchBadge.classList.toggle("visible", unread > 0);
  }

  // ---------- Match overlay ----------
  let overlayMatchId = null;
  function showMatchOverlay(matchId) {
    const m = state.matches.find((x) => x.id === matchId);
    const p = m && matchPartner(m);
    if (!p) return;
    overlayMatchId = matchId;
    $("overlay-avatars").innerHTML = avatarHtml(state.me, "lg") + avatarHtml(p, "lg");
    $("overlay-text").textContent = m.source === "staff"
      ? `The Yolink team thinks you and ${p.name.split(" ")[0]} should talk.`
      : `You and ${p.name.split(" ")[0]} both want to connect.`;
    $("match-overlay").classList.add("visible");
  }
  function hideMatchOverlay() {
    $("match-overlay").classList.remove("visible");
    overlayMatchId = null;
  }

  // ---------- App entry ----------
  async function enterApp() {
    await refreshAll({ silent: true });
    api.subscribe(scheduleRefresh);
    showScreen("discover");
  }

  async function init() {
    // wire events
    $("btn-start-onboarding").addEventListener("click", () => { showObStep(1); showScreen("onboarding"); });
    $("btn-goto-login").addEventListener("click", () => showScreen("login"));
    $("btn-login").addEventListener("click", doLogin);
    $("login-code").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
    $("btn-login-back").addEventListener("click", () => showScreen("welcome"));
    $("btn-ob-next").addEventListener("click", obNext);
    $("btn-ob-back").addEventListener("click", obBack);
    $("btn-copy-code").addEventListener("click", () => copyText(state.code, "Code copied — keep it safe!"));
    $("btn-code-done").addEventListener("click", enterApp);
    $("btn-profile-copy-code").addEventListener("click", () => copyText(state.code, "Code copied — keep it safe!"));
    $("btn-save-profile").addEventListener("click", saveProfile);
    $("btn-logout").addEventListener("click", logout);
    $("chat-form").addEventListener("submit", sendChatMessage);
    $("btn-chat-back").addEventListener("click", () => showScreen("matches"));
    $("btn-overlay-chat").addEventListener("click", () => { const id = overlayMatchId; hideMatchOverlay(); if (id) openChat(id); });
    $("btn-overlay-close").addEventListener("click", hideMatchOverlay);
    document.querySelectorAll(".nav-btn").forEach((btn) =>
      btn.addEventListener("click", () => showScreen(btn.dataset.screen))
    );
    [["ob-background", "ob-background-count"], ["ob-looking", "ob-looking-count"]].forEach(([inputId, countId]) => {
      $(inputId).addEventListener("input", () => { $(countId).textContent = $(inputId).value.length; });
    });

    // resume session if we have one
    const sess = session();
    if (sess?.code) {
      state.code = sess.code;
      state.me = sess.profile;
      try {
        state.me = await api.login(sess.code); // re-validate + refresh profile
        saveSession(sess.code, state.me);
        await enterApp();
        return;
      } catch {
        clearSession();
        state.me = null;
        state.code = null;
      }
    }
    showScreen("welcome");
  }

  init();
})();
