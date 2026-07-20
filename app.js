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
    EVENT_NOT_FOUND: "That event is no longer available.",
    ALREADY_JOINED: "You're already going to this event.",
    EVENT_FULL: "This event has reached its participant limit.",
    NOT_EVENT_HOST: "Only the event host can make that change.",
    CANNOT_REMOVE_HOST: "The event host can't be removed from their own event.",
    PARTICIPANT_NOT_FOUND: "That participant is no longer part of this event.",
    CAPACITY_TOO_LOW: "The maximum can't be below the number of people already going.",
    EVENT_ALREADY_STARTED: "Only upcoming events can be cancelled.",
    SELF_REPORT: "You can't report your own profile.",
    ALREADY_REPORTED: "You've already reported this profile.",
  };
  function friendlyError(err) {
    const msg = err?.message || String(err);
    for (const key of Object.keys(ERROR_MESSAGES)) {
      if (msg.includes(key)) return ERROR_MESSAGES[key];
    }
    return "Something went wrong. Please try again.";
  }
  function eventPublishError(err) {
    const msg = err?.message || String(err);
    // This is the most common cause when an Events feature is added to an
    // already-configured project: the frontend is updated before its one-time
    // database migration. Keep the message useful without exposing raw SQL.
    if (/events|event_participants|create_event|permission denied/i.test(msg)) {
      return "Events needs a quick database update before publishing. Run the Events migration in Supabase, then try again.";
    }
    return friendlyError(err);
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
  async function loadProfileImage(file) {
    if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error("Please choose a JPG, PNG, or WebP image.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Please choose an image smaller than 10 MB.");
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("We couldn't read that image."));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("We couldn't process that image."));
      img.onload = () => resolve(img);
      img.src = source;
    });
    return image;
  }
  function constrainCrop() {
    const crop = state.photoCrop;
    if (!crop) return;
    const width = crop.baseWidth * crop.zoom, height = crop.baseHeight * crop.zoom;
    crop.x = Math.max(-(width - 240) / 2, Math.min((width - 240) / 2, crop.x));
    crop.y = Math.max(-(height - 240) / 2, Math.min((height - 240) / 2, crop.y));
  }
  function renderPhotoCrop() {
    const crop = state.photoCrop;
    if (!crop) return;
    constrainCrop();
    const image = $("photo-crop-image");
    image.src = crop.image.src;
    image.style.width = `${crop.baseWidth * crop.zoom}px`;
    image.style.height = `${crop.baseHeight * crop.zoom}px`;
    image.style.transform = `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px)`;
    $("photo-crop-zoom").value = crop.zoom;
  }
  async function selectProfileImage(input, stateKey, statusId) {
    if (!input.files?.[0]) return;
    const status = $(statusId);
    const previousStatus = status.textContent;
    try {
      status.textContent = "Preparing photo…";
      const image = await loadProfileImage(input.files[0]);
      const scale = 240 / Math.min(image.width, image.height);
      state.photoCrop = { image, stateKey, statusId, inputId: input.id, previousStatus, original: state[stateKey], baseWidth: image.width * scale, baseHeight: image.height * scale, zoom: 1, x: 0, y: 0 };
      renderPhotoCrop();
      $("photo-crop-modal").classList.add("visible");
      $("photo-crop-modal").setAttribute("aria-hidden", "false");
    } catch (err) {
      input.value = "";
      status.textContent = err.message || "Please try another image.";
    }
  }
  function closePhotoCrop(keepExisting = true) {
    const crop = state.photoCrop;
    if (crop && !keepExisting) {
      state[crop.stateKey] = crop.original;
      $(crop.inputId).value = "";
      $(crop.statusId).textContent = crop.previousStatus;
    }
    $("photo-crop-modal").classList.remove("visible");
    $("photo-crop-modal").setAttribute("aria-hidden", "true");
    state.photoCrop = null;
  }
  function useCroppedPhoto() {
    const crop = state.photoCrop;
    if (!crop) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 480;
    const ratio = 2;
    const width = crop.baseWidth * crop.zoom * ratio;
    const height = crop.baseHeight * crop.zoom * ratio;
    const x = (480 - width) / 2 + crop.x * ratio;
    const y = (480 - height) / 2 + crop.y * ratio;
    canvas.getContext("2d").drawImage(crop.image, x, y, width, height);
    state[crop.stateKey] = canvas.toDataURL("image/jpeg", 0.82);
    $(crop.statusId).textContent = "Photo ready ✓";
    closePhotoCrop();
  }
  function shareEventLink(eventId) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("event", eventId);
    copyText(url.toString(), "Event link copied!");
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
        p_avatar_color: f.avatar_color, p_avatar_image: f.avatar_image,
      }),
      login: (code) => rpc("login", { p_code: code }),
      updateProfile: (code, f) => rpc("update_profile", {
        p_code: code, p_name: f.name, p_title: f.title, p_company: f.company,
        p_industry: f.industry, p_years_exp: f.years_exp,
        p_background: f.background, p_looking_for: f.looking_for, p_avatar_image: f.avatar_image,
      }),
      sendRequest: (code, toId, kind) => rpc("send_request", { p_code: code, p_to_id: toId, p_kind: kind }),
      respondRequest: (code, reqId, accept) => rpc("respond_request", { p_code: code, p_request_id: reqId, p_accept: accept }),
      sendMessage: (code, matchId, body) => rpc("send_message", { p_code: code, p_match_id: matchId, p_body: body }),
      createEvent: (code, event) => rpc("create_event", { p_code: code, p_title: event.title, p_description: event.description, p_starts_at: event.starts_at, p_location: event.location, p_industries: event.industries, p_max_participants: event.max_participants }),
      updateEvent: (code, eventId, event) => rpc("update_event", { p_code: code, p_event_id: eventId, p_title: event.title, p_description: event.description, p_starts_at: event.starts_at, p_location: event.location, p_industries: event.industries, p_max_participants: event.max_participants }),
      joinEvent: (code, eventId) => rpc("join_event", { p_code: code, p_event_id: eventId }),
      removeEventParticipant: (code, eventId, profileId) => rpc("remove_event_participant", { p_code: code, p_event_id: eventId, p_profile_id: profileId }),
      leaveEvent: (code, eventId) => rpc("leave_event", { p_code: code, p_event_id: eventId }),
      cancelEvent: (code, eventId) => rpc("cancel_event", { p_code: code, p_event_id: eventId }),
      reportProfile: (code, profileId, reason) => rpc("report_profile", { p_code: code, p_profile_id: profileId, p_reason: reason }),

      async fetchAll(myId) {
        const [profiles, requests, matches] = await Promise.all([
          sb.from("profiles").select("*").order("created_at", { ascending: false }),
          sb.from("requests").select("*"),
          sb.from("matches").select("*"),
        ]);
        for (const r of [profiles, requests, matches]) if (r.error) throw r.error;

        // Events are an additive feature. Keep the existing app usable until
        // the one-time Events migration has been run in Supabase.
        const [events, participants] = await Promise.all([
          sb.from("events").select("*").order("starts_at", { ascending: true }),
          sb.from("event_participants").select("*"),
        ]);
        const eventsAvailable = !events.error && !participants.error;
        const myMatches = matches.data.filter((m) => m.user_a === myId || m.user_b === myId);
        let messages = [];
        if (myMatches.length) {
          const res = await sb.from("messages").select("*")
            .in("match_id", myMatches.map((m) => m.id))
            .order("created_at", { ascending: true });
          if (res.error) throw res.error;
          messages = res.data;
        }
        return { profiles: profiles.data, requests: requests.data, matches: matches.data, messages,
          events: eventsAvailable ? events.data : [], participants: eventsAvailable ? participants.data : [], eventsAvailable };
      },

      subscribe(onChange) {
        channel = sb.channel("yolink-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "events" }, onChange)
          .on("postgres_changes", { event: "*", schema: "public", table: "event_participants" }, onChange)
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
      const db = { profiles: [], secrets: {}, requests: [], matches: [], messages: [], events: [], participants: [], reports: [], msgSeq: 1 };
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

    function db() {
      const d = load() || seed();
      d.events ||= [];
      d.participants ||= [];
      d.reports ||= [];
      return d;
    }

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
          looking_for: f.looking_for, avatar_color: f.avatar_color, avatar_image: f.avatar_image || null, created_at: new Date().toISOString() };
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
          industry: f.industry, years_exp: f.years_exp, background: f.background, looking_for: f.looking_for, avatar_image: f.avatar_image || null });
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
      async createEvent(code, event) {
        const d = db();
        const creatorId = auth(d, code);
        const row = { id: uuid(), creator_id: creatorId, title: event.title.trim(), description: event.description.trim() || null, starts_at: event.starts_at, location: event.location.trim(), industries: event.industries || "", max_participants: event.max_participants, created_at: new Date().toISOString() };
        d.events.push(row);
        d.participants.push({ event_id: row.id, profile_id: creatorId, joined_at: new Date().toISOString() });
        save(d);
        return delay(row);
      },
      async joinEvent(code, eventId) {
        const d = db();
        const profileId = auth(d, code);
        if (!d.events.some((event) => event.id === eventId)) throw new Error("EVENT_NOT_FOUND");
        if (d.participants.some((row) => row.event_id === eventId && row.profile_id === profileId)) throw new Error("ALREADY_JOINED");
        const event = d.events.find((item) => item.id === eventId);
        if (d.participants.filter((row) => row.event_id === eventId).length >= (event.max_participants || 20)) throw new Error("EVENT_FULL");
        const row = { event_id: eventId, profile_id: profileId, joined_at: new Date().toISOString() };
        d.participants.push(row);
        save(d);
        return delay(row);
      },
      async updateEvent(code, eventId, event) {
        const d = db();
        const hostId = auth(d, code);
        const index = d.events.findIndex((item) => item.id === eventId);
        if (index < 0) throw new Error("EVENT_NOT_FOUND");
        if (d.events[index].creator_id !== hostId) throw new Error("NOT_EVENT_HOST");
        if (event.max_participants < d.participants.filter((row) => row.event_id === eventId).length) throw new Error("CAPACITY_TOO_LOW");
        d.events[index] = { ...d.events[index], title: event.title.trim(), description: event.description.trim() || null, starts_at: event.starts_at, location: event.location.trim(), industries: event.industries, max_participants: event.max_participants };
        save(d);
        return delay(d.events[index]);
      },
      async removeEventParticipant(code, eventId, profileId) {
        const d = db();
        const hostId = auth(d, code);
        const event = d.events.find((item) => item.id === eventId);
        if (!event) throw new Error("EVENT_NOT_FOUND");
        if (event.creator_id !== hostId) throw new Error("NOT_EVENT_HOST");
        if (profileId === hostId) throw new Error("CANNOT_REMOVE_HOST");
        const index = d.participants.findIndex((row) => row.event_id === eventId && row.profile_id === profileId);
        if (index < 0) throw new Error("PARTICIPANT_NOT_FOUND");
        const [removed] = d.participants.splice(index, 1);
        save(d);
        return delay(removed);
      },
      async leaveEvent(code, eventId) {
        const d = db();
        const profileId = auth(d, code);
        const event = d.events.find((item) => item.id === eventId);
        if (!event) throw new Error("EVENT_NOT_FOUND");
        if (event.creator_id === profileId) throw new Error("CANNOT_REMOVE_HOST");
        const index = d.participants.findIndex((row) => row.event_id === eventId && row.profile_id === profileId);
        if (index < 0) throw new Error("PARTICIPANT_NOT_FOUND");
        const [left] = d.participants.splice(index, 1);
        save(d);
        return delay(left);
      },
      async cancelEvent(code, eventId) {
        const d = db();
        const hostId = auth(d, code);
        const index = d.events.findIndex((item) => item.id === eventId);
        if (index < 0) throw new Error("EVENT_NOT_FOUND");
        const event = d.events[index];
        if (event.creator_id !== hostId) throw new Error("NOT_EVENT_HOST");
        if (new Date(event.starts_at) <= new Date()) throw new Error("EVENT_ALREADY_STARTED");
        d.events.splice(index, 1);
        d.participants = d.participants.filter((row) => row.event_id !== eventId);
        save(d);
        return delay(event);
      },
      async reportProfile(code, profileId, reason) {
        const d = db();
        const reporterId = auth(d, code);
        if (reporterId === profileId) throw new Error("SELF_REPORT");
        if (!d.profiles.some((profile) => profile.id === profileId)) throw new Error("INVALID_CODE");
        if (d.reports.some((report) => report.reporter_id === reporterId && report.reported_profile_id === profileId)) throw new Error("ALREADY_REPORTED");
        const report = { id: uuid(), reporter_id: reporterId, reported_profile_id: profileId, reason: reason.trim(), status: "open", created_at: new Date().toISOString() };
        d.reports.push(report);
        save(d);
        return delay(report);
      },
      async fetchAll(myId) {
        const d = db();
        const myMatchIds = new Set(d.matches.filter((m) => m.user_a === myId || m.user_b === myId).map((m) => m.id));
        return delay({
          profiles: [...d.profiles],
          requests: [...d.requests],
          matches: [...d.matches],
          messages: d.messages.filter((m) => myMatchIds.has(m.match_id)),
          events: [...d.events],
          participants: [...d.participants],
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
    events: [],
    participants: [],
    eventsAvailable: true,
    openEventId: null,
    discoverIndustry: "all",
    discoverExperience: "all",
    openDiscoverFilter: null,
    eventPickerOpen: null,
    eventCalendarCursor: new Date(),
    reportProfileId: null,
    profileEditing: false,
    myEventsDate: "all",
    myEventsFilterOpen: false,
    eventIndustry: "all",
    eventTime: "upcoming",
    openEventFilter: null,
    editingEventId: null,
    onboardingAvatarImage: null,
    profileAvatarImage: null,
    photoCrop: null,
    photoCropDrag: null,
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
  const participantsFor = (eventId) => state.participants.filter((p) => p.event_id === eventId);

  function unreadCount(matchId) {
    const last = lastReadMap()[matchId];
    return messagesFor(matchId).filter(
      (m) => m.sender_id !== state.me.id && (!last || m.created_at > last)
    ).length;
  }

  // ---------- Router ----------
  const NAV_SCREENS = ["discover", "events", "requests", "matches", "profile"];
  function showScreen(name) {
    if (name === "profile") state.profileEditing = false;
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
    const renderers = { discover: renderDiscover, events: renderEvents, "my-events": renderMyEvents, requests: renderRequests, matches: renderMatches, profile: renderProfileScreen };
    renderers[name]?.();
    updateBadges();
  }

  // ---------- Shared render bits ----------
  function avatarHtml(profile, size) {
    const photo = profile.avatar_image ? `<img src="${esc(profile.avatar_image)}" alt="${esc(profile.name)}">` : esc(initials(profile.name));
    return `<div class="avatar ${size}" style="background:${esc(profile.avatar_color)}">${photo}</div>`;
  }

  function profileCardHtml(p, actionsHtml, bannerHtml) {
    const company = p.company ? ` <span style="opacity:.75">@ ${esc(p.company)}</span>` : "";
    const industries = String(p.industry || "").split("|").map((industry) => industry.trim()).filter(Boolean);
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
            ${industries.map((industry) => `<span class="chip">${esc(industry)}</span>`).join("")}
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

    const allIndustries = [...new Set(state.profiles.flatMap((p) => String(p.industry || "").split("|").map((industry) => industry.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b));
    const experienceOptions = [["all", "All experience"], ["0-2", "0–2 years"], ["3-5", "3–5 years"], ["6-10", "6–10 years"], ["11+", "11+ years"]];
    const filterHtml = (type, label, selected, options) => {
      const selectedLabel = options.find(([value]) => value === selected)?.[1] || options[0][1];
      return `<div class="discover-filter"><label>${esc(label)}</label><button class="discover-filter-trigger" data-filter-toggle="${type}" aria-expanded="${state.openDiscoverFilter === type}"><span>${esc(selectedLabel)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>${state.openDiscoverFilter === type ? `<div class="discover-filter-menu">${options.map(([value, text]) => `<button data-filter-option="${type}" data-filter-value="${esc(value)}" class="${value === selected ? "selected" : ""}">${esc(text)}</button>`).join("")}</div>` : ""}</div>`;
    };
    $("discover-filters").innerHTML = `<div class="discover-filter-bar">${filterHtml("industry", "Industry", state.discoverIndustry, [["all", "All industries"], ...allIndustries.map((industry) => [industry, industry])])}${filterHtml("experience", "Experience", state.discoverExperience, experienceOptions)}</div>`;
    $("discover-filters").querySelectorAll("[data-filter-toggle]").forEach((button) => button.addEventListener("click", () => {
      state.openDiscoverFilter = state.openDiscoverFilter === button.dataset.filterToggle ? null : button.dataset.filterToggle;
      renderDiscover();
    }));
    $("discover-filters").querySelectorAll("[data-filter-option]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.filterOption === "industry") state.discoverIndustry = button.dataset.filterValue;
      else state.discoverExperience = button.dataset.filterValue;
      state.openDiscoverFilter = null;
      renderDiscover();
    }));

    const matchesExperience = (years) => {
      if (state.discoverExperience === "all") return true;
      if (state.discoverExperience === "11+") return years >= 11;
      const [min, max] = state.discoverExperience.split("-").map(Number);
      return years >= min && years <= max;
    };
    const pool = state.profiles.filter((p) => {
      const industries = String(p.industry || "").split("|").map((industry) => industry.trim());
      return p.id !== state.me.id && !matchedIds.has(p.id) &&
        (state.discoverIndustry === "all" || industries.includes(state.discoverIndustry)) && matchesExperience(p.years_exp);
    });
    if (!pool.length) {
      const filtered = state.discoverIndustry !== "all" || state.discoverExperience !== "all";
      $("discover-list").innerHTML = filtered
        ? emptyStateHtml("🔎", "No matching members", "Try widening one of your filters.")
        : emptyStateHtml("🌱", "The pool is warming up", "No one else here yet — invite a few friends to create profiles.");
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
            <button class="report-btn" data-report="${esc(p.id)}">Report</button>
          </div>`;
      }
      return profileCardHtml(p, actions);
    }).join("");

    $("discover-list").querySelectorAll("[data-request]").forEach((btn) => {
      btn.addEventListener("click", () => sendRequestClick(btn.dataset.to, btn.dataset.request, btn));
    });
    $("discover-list").querySelectorAll("[data-report]").forEach((btn) => {
      btn.addEventListener("click", () => reportProfile(btn.dataset.report));
    });
  }

  function reportProfile(profileId) {
    const profile = profileById(profileId);
    if (!profile) return;
    state.reportProfileId = profileId;
    $("report-profile-name").textContent = profile.name;
    $("report-reason").value = "";
    $("report-error").classList.remove("visible");
    $("report-modal").classList.add("visible");
    $("report-modal").setAttribute("aria-hidden", "false");
    $("report-reason").focus();
  }
  function closeReportModal() {
    state.reportProfileId = null;
    $("report-modal").classList.remove("visible");
    $("report-modal").setAttribute("aria-hidden", "true");
  }
  async function submitReport() {
    const reason = $("report-reason").value.trim();
    const error = $("report-error");
    if (!reason) { error.textContent = "Please briefly describe the issue."; error.classList.add("visible"); return; }
    const button = $("btn-submit-report");
    button.disabled = true; error.classList.remove("visible");
    try {
      await api.reportProfile(state.code, state.reportProfileId, reason);
      closeReportModal();
      toast("Thanks — your report was sent to the Yolink team.");
    } catch (err) {
      error.textContent = friendlyError(err);
      error.classList.add("visible");
    } finally { button.disabled = false; }
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

  // ---------- Events ----------
  function dateInputValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function timeLabel(value) {
    if (!value) return "Choose time";
    const [hours, minutes] = value.split(":").map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  function renderEventPickers() {
    const dateValue = $("event-date").value;
    const timeValue = $("event-time").value;
    $("event-date-trigger").textContent = dateValue ? new Date(`${dateValue}T12:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Pick a date";
    $("event-time-trigger").textContent = timeLabel(timeValue);
    const dateMenu = $("event-date-menu");
    const timeMenu = $("event-time-menu");
    dateMenu.hidden = state.eventPickerOpen !== "date";
    timeMenu.hidden = state.eventPickerOpen !== "time";
    if (state.eventPickerOpen === "date") {
      const cursor = state.eventCalendarCursor;
      const todayValue = dateInputValue(new Date());
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const blanks = Array.from({ length: first.getDay() }, () => "<span></span>").join("");
      const dayButtons = Array.from({ length: days }, (_, index) => {
        const date = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1);
        const value = dateInputValue(date);
        const classes = [value === dateValue ? "selected" : "", value === todayValue ? "today" : ""].filter(Boolean).join(" ");
        return `<button data-event-date="${value}" class="${classes}">${index + 1}</button>`;
      }).join("");
      dateMenu.innerHTML = `<div class="calendar-head"><button class="calendar-nav" data-calendar-month="-1" aria-label="Previous month">‹</button><span>${esc(cursor.toLocaleDateString([], { month: "long", year: "numeric" }))}</span><button class="calendar-nav" data-calendar-month="1" aria-label="Next month">›</button></div><div class="calendar-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="calendar-days">${blanks}${dayButtons}</div>`;
    } else dateMenu.innerHTML = "";
    if (state.eventPickerOpen === "time") {
      const times = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);
      timeMenu.innerHTML = times.map((time) => `<button data-event-time="${time}" class="${time === timeValue ? "selected" : ""}">${esc(timeLabel(time))}</button>`).join("");
    } else timeMenu.innerHTML = "";
  }
  function toggleEventPicker(type) {
    state.eventPickerOpen = state.eventPickerOpen === type ? null : type;
    if (state.eventPickerOpen === "date" && $("event-date").value) state.eventCalendarCursor = new Date(`${$("event-date").value}T12:00`);
    renderEventPickers();
  }
  function fmtEventTime(iso) {
    return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function eventDateHtml(iso) {
    const d = new Date(iso);
    return `<div class="event-date"><div class="month">${esc(d.toLocaleDateString([], { month: "short" }))}</div><div class="day">${esc(String(d.getDate()))}</div></div>`;
  }
  function eventIndustries(event) {
    return String(event.industries || "").split("|").map((industry) => industry.trim()).filter(Boolean);
  }
  function eventCardHtml(event, expanded, membership) {
    const count = participantsFor(event.id).length;
    const role = membership ? `<div class="event-membership ${membership === "Hosting" ? "hosting" : ""}">${esc(membership)}</div>` : "";
    const industries = eventIndustries(event);
    const tags = industries.length ? `<div class="event-industries">${industries.map((industry) => `<span>${esc(industry)}</span>`).join("")}</div>` : "";
    return `<div class="card event-card" data-open-event="${esc(event.id)}"><div class="event-top">${eventDateHtml(event.starts_at)}<div class="event-meta"><h2>${esc(event.title)}</h2><div class="when">${esc(fmtEventTime(event.starts_at))}</div><div class="where">📍 ${esc(event.location)}</div>${tags}<div class="going">${count} / ${esc(String(event.max_participants || 20))} going</div>${role}</div></div>${expanded || ""}</div>`;
  }
  function eventProfileTagHtml(profile, removableEventId) {
    const remove = removableEventId ? `<button class="remove-participant" data-remove-participant="${esc(profile.id)}" data-remove-from-event="${esc(removableEventId)}" aria-label="Remove ${esc(profile.name)} from event">×</button>` : "";
    return `<div class="participant-control"><button class="participant" data-view-profile="${esc(profile.id)}">${avatarHtml(profile, "sm")}<span>${esc(profile.name)}</span></button>${remove}</div>`;
  }
  function eventDetailHtml(detail, hostControls = false) {
    const people = participantsFor(detail.id).map((row) => profileById(row.profile_id)).filter(Boolean);
    const creator = profileById(detail.creator_id);
    const joined = people.some((person) => person.id === state.me.id);
    const isFull = people.length >= (detail.max_participants || 20);
    const upcoming = new Date(detail.starts_at) > new Date();
    const attendeeTags = people.map((person) => eventProfileTagHtml(person, hostControls && person.id !== detail.creator_id ? detail.id : null)).join("");
    const hostActions = hostControls ? `<button class="btn full secondary event-edit-btn" data-edit-event="${esc(detail.id)}">Edit event</button>${upcoming ? `<button class="btn full danger-ghost event-cancel-btn" data-cancel-event="${esc(detail.id)}">Cancel event</button>` : ""}` : "";
    const attendanceAction = joined && detail.creator_id !== state.me.id
      ? `<button class="btn full secondary" data-leave-event="${esc(detail.id)}">Quit event</button>`
      : `<button class="btn full ${joined ? "requested" : ""}" data-join-event="${esc(detail.id)}" ${joined || isFull ? "disabled" : ""}>${joined ? "You're going ✓" : isFull ? "Event is full" : "Join event"}</button>`;
    return `<div class="event-expanded"><button class="btn ghost event-back" data-close-event>← Close details</button>${detail.description ? `<div class="event-description">${esc(detail.description)}</div>` : ""}${creator ? `<div class="section-label">Event host</div><div class="participant-list">${eventProfileTagHtml(creator)}</div>` : ""}<div class="section-label">Participants · ${people.length} of ${esc(String(detail.max_participants || 20))}</div><div class="participant-list">${attendeeTags || "<span class=\"hint\">No participants yet.</span>"}</div>${hostActions}${attendanceAction}<button class="btn full ghost event-share-btn" data-share-event="${esc(detail.id)}">Copy event link</button></div>`;
  }
  function renderEvents() {
    if (!state.eventsAvailable) {
      $("btn-show-event-form").hidden = true;
      $("btn-open-my-events").hidden = true;
      $("event-create-panel").hidden = true;
      $("event-filters").innerHTML = "";
      $("event-detail").innerHTML = "";
      $("events-list").innerHTML = emptyStateHtml("⚙️", "Events need one last setup step", "The existing networking features are still working. Run the Events migration in Supabase to activate this page.");
      return;
    }
    const form = $("event-create-panel");
    $("btn-open-my-events").hidden = false;
    const allIndustries = [...new Set(state.events.flatMap(eventIndustries))].sort((a, b) => a.localeCompare(b));
    const filterHtml = (type, label, selected, options) => {
      const selectedLabel = options.find(([value]) => value === selected)?.[1] || options[0][1];
      return `<div class="discover-filter event-filter"><label>${esc(label)}</label><button class="discover-filter-trigger" data-event-filter-toggle="${type}" aria-expanded="${state.openEventFilter === type}"><span>${esc(selectedLabel)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>${state.openEventFilter === type ? `<div class="discover-filter-menu">${options.map(([value, text]) => `<button data-event-filter-option="${type}" data-event-filter-value="${esc(value)}" class="${value === selected ? "selected" : ""}">${esc(text)}</button>`).join("")}</div>` : ""}</div>`;
    };
    const timeOptions = [["upcoming", "Upcoming"], ["today", "Today"], ["week", "This week"], ["past", "Past"], ["all", "All time"]];
    $("event-filters").innerHTML = `<div class="discover-filter-bar event-filter-bar">${filterHtml("industry", "Industry", state.eventIndustry, [["all", "All industries"], ...allIndustries.map((industry) => [industry, industry])])}${filterHtml("time", "Time", state.eventTime, timeOptions)}</div>`;
    $("event-filters").querySelectorAll("[data-event-filter-toggle]").forEach((button) => button.addEventListener("click", () => { state.openEventFilter = state.openEventFilter === button.dataset.eventFilterToggle ? null : button.dataset.eventFilterToggle; renderEvents(); }));
    $("event-filters").querySelectorAll("[data-event-filter-option]").forEach((button) => button.addEventListener("click", () => { if (button.dataset.eventFilterOption === "industry") state.eventIndustry = button.dataset.eventFilterValue; else state.eventTime = button.dataset.eventFilterValue; state.openEventFilter = null; renderEvents(); }));
    const detail = state.events.find((event) => event.id === state.openEventId);
    form.hidden = !form.dataset.open;
    $("btn-show-event-form").hidden = !!form.dataset.open;
    $("event-detail").innerHTML = "";
    const now = new Date();
    const today = dateInputValue(now);
    const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + 7);
    const list = state.events.filter((event) => {
      const start = new Date(event.starts_at);
      const industryMatch = state.eventIndustry === "all" || eventIndustries(event).includes(state.eventIndustry);
      const timeMatch = state.eventTime === "all" || (state.eventTime === "upcoming" && start >= now) || (state.eventTime === "today" && dateInputValue(start) === today) || (state.eventTime === "week" && start >= now && start <= endOfWeek) || (state.eventTime === "past" && start < now);
      return industryMatch && timeMatch;
    }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const filtered = state.eventIndustry !== "all" || state.eventTime !== "upcoming";
    $("events-list").innerHTML = list.length ? list.map((event) => eventCardHtml(event, event.id === detail?.id ? eventDetailHtml(event) : "")).join("") : emptyStateHtml(filtered ? "🔎" : "📅", filtered ? "No matching events" : "No events yet", filtered ? "Try widening your industry or time filter." : "Be the person who gets the first gathering on the calendar.");
    $("events-list").querySelectorAll("[data-open-event]").forEach((card) => card.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close-event], [data-join-event], [data-leave-event], [data-cancel-event], [data-share-event], [data-view-profile], [data-edit-event], [data-remove-participant]")) return;
      state.openEventId = card.dataset.openEvent; renderEvents();
    }));
    $("events-list").querySelector("[data-close-event]")?.addEventListener("click", () => { state.openEventId = null; renderEvents(); });
    $("events-list").querySelector("[data-join-event]")?.addEventListener("click", (ev) => joinEventClick(ev.currentTarget.dataset.joinEvent, ev.currentTarget));
    $("events-list").querySelector("[data-leave-event]")?.addEventListener("click", (ev) => leaveEventClick(ev.currentTarget.dataset.leaveEvent, ev.currentTarget, renderEvents));
    $("events-list").querySelector("[data-share-event]")?.addEventListener("click", (ev) => shareEventLink(ev.currentTarget.dataset.shareEvent));
    $("events-list").querySelectorAll("[data-view-profile]").forEach((tag) => tag.addEventListener("click", () => showMemberProfile(tag.dataset.viewProfile)));
  }

  function renderMyEvents() {
    const mine = state.events.filter((event) => event.creator_id === state.me.id || participantsFor(event.id).some((row) => row.profile_id === state.me.id));
    const dateOptions = [...new Set(mine.map((event) => dateInputValue(new Date(event.starts_at))))].sort((a, b) => a.localeCompare(b));
    const options = [["all", "All dates"], ["upcoming", "Upcoming"], ["past", "Past"], ...dateOptions.map((date) => [date, new Date(`${date}T12:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })])];
    const selectedLabel = options.find(([value]) => value === state.myEventsDate)?.[1] || "All dates";
    $("my-events-filter").innerHTML = `<div class="my-events-filter"><span class="event-control-label">Filter by date</span><button class="discover-filter-trigger" id="btn-my-events-filter" aria-expanded="${state.myEventsFilterOpen}"><span>${esc(selectedLabel)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>${state.myEventsFilterOpen ? `<div class="discover-filter-menu my-events-filter-menu">${options.map(([value, label]) => `<button data-my-events-date="${esc(value)}" class="${value === state.myEventsDate ? "selected" : ""}">${esc(label)}</button>`).join("")}</div>` : ""}</div>`;
    $("btn-my-events-filter").addEventListener("click", () => { state.myEventsFilterOpen = !state.myEventsFilterOpen; renderMyEvents(); });
    $("my-events-filter").querySelectorAll("[data-my-events-date]").forEach((button) => button.addEventListener("click", () => { state.myEventsDate = button.dataset.myEventsDate; state.myEventsFilterOpen = false; renderMyEvents(); }));

    const now = new Date();
    const matchesFilter = (event) => state.myEventsDate === "all" ||
      (state.myEventsDate === "upcoming" && new Date(event.starts_at) >= now) ||
      (state.myEventsDate === "past" && new Date(event.starts_at) < now) ||
      dateInputValue(new Date(event.starts_at)) === state.myEventsDate;
    const card = (event) => eventCardHtml(event, event.id === state.openEventId ? eventDetailHtml(event, event.creator_id === state.me.id) : "", event.creator_id === state.me.id ? "Hosting" : "Going");
    const filtered = mine.filter(matchesFilter);
    if (!filtered.length) {
      $("my-events-list").innerHTML = emptyStateHtml("📆", "No events here yet", state.myEventsDate === "all" ? "Events you host or join will be collected here." : "Try a different date filter.");
    } else if (state.myEventsDate === "all") {
      const upcoming = filtered.filter((event) => new Date(event.starts_at) >= now).sort((a, b) => a.starts_at.localeCompare(b));
      const past = filtered.filter((event) => new Date(event.starts_at) < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
      $("my-events-list").innerHTML = `${upcoming.length ? `<div class="section-label my-events-label">Upcoming</div>${upcoming.map(card).join("")}` : ""}${past.length ? `<div class="section-label my-events-label">Past events</div>${past.map(card).join("")}` : ""}`;
    } else {
      $("my-events-list").innerHTML = filtered.sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(card).join("");
    }
    $("my-events-list").querySelectorAll("[data-open-event]").forEach((eventCard) => eventCard.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close-event], [data-join-event], [data-leave-event], [data-cancel-event], [data-share-event], [data-view-profile], [data-edit-event], [data-remove-participant]")) return;
      state.openEventId = eventCard.dataset.openEvent; renderMyEvents();
    }));
    $("my-events-list").querySelector("[data-close-event]")?.addEventListener("click", () => { state.openEventId = null; renderMyEvents(); });
    $("my-events-list").querySelector("[data-leave-event]")?.addEventListener("click", (ev) => leaveEventClick(ev.currentTarget.dataset.leaveEvent, ev.currentTarget, renderMyEvents));
    $("my-events-list").querySelector("[data-share-event]")?.addEventListener("click", (ev) => shareEventLink(ev.currentTarget.dataset.shareEvent));
    $("my-events-list").querySelectorAll("[data-view-profile]").forEach((tag) => tag.addEventListener("click", () => showMemberProfile(tag.dataset.viewProfile)));
    $("my-events-list").querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => startEventEdit(button.dataset.editEvent)));
    $("my-events-list").querySelectorAll("[data-remove-participant]").forEach((button) => button.addEventListener("click", () => removeEventParticipant(button.dataset.removeFromEvent, button.dataset.removeParticipant, button)));
    $("my-events-list").querySelectorAll("[data-cancel-event]").forEach((button) => button.addEventListener("click", () => cancelEvent(button.dataset.cancelEvent, button)));
  }
  function showMemberProfile(profileId) {
    const profile = profileById(profileId);
    if (!profile) return;
    $("member-modal-content").innerHTML = profileCardHtml(profile);
    $("member-modal").classList.add("visible");
    $("member-modal").setAttribute("aria-hidden", "false");
  }
  function closeMemberProfile() {
    $("member-modal").classList.remove("visible");
    $("member-modal").setAttribute("aria-hidden", "true");
  }
  function showEventForm() {
    state.editingEventId = null;
    $("event-create-panel").querySelector(".section-label").textContent = "New event";
    $("btn-create-event").textContent = "Publish event";
    $("event-create-panel").dataset.open = "true";
    renderEvents();
    $("event-title").focus();
  }
  async function createEventClick() {
    const error = $("event-error");
    const title = $("event-title").value.trim();
    const date = $("event-date").value;
    const time = $("event-time").value;
    const location = $("event-location").value.trim();
    const description = $("event-description").value.trim();
    const industries = [1, 2].map((number) => $("event-industry-" + number).value.trim()).filter(Boolean);
    const maxParticipants = parseInt($("event-max-participants").value, 10);
    if (!title || !date || !time || !location) { error.textContent = "Please add an event name, date, time, and location."; error.classList.add("visible"); return; }
    if (!industries.length) { error.textContent = "Choose at least one industry for this event."; error.classList.add("visible"); return; }
    if (Number.isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 500) { error.textContent = "Maximum participants should be between 1 and 500."; error.classList.add("visible"); return; }
    const button = $("btn-create-event"); button.disabled = true; error.classList.remove("visible");
    try {
      const eventData = { title, description, starts_at: new Date(`${date}T${time}`).toISOString(), location, industries: industries.join(" | "), max_participants: maxParticipants };
      const editing = state.editingEventId;
      const event = editing ? await api.updateEvent(state.code, editing, eventData) : await api.createEvent(state.code, eventData);
      await refreshAll({ silent: true });
      state.openEventId = event.id;
      ["event-title", "event-date", "event-time", "event-location", "event-industry-1", "event-industry-2", "event-description"].forEach((id) => { $(id).value = ""; });
      $("event-max-participants").value = 20;
      state.eventPickerOpen = null;
      state.editingEventId = null;
      renderEventPickers();
      delete $("event-create-panel").dataset.open;
      if (editing) { showScreen("my-events"); toast("Event updated ✓"); }
      else { renderEvents(); toast("Event published 🎉"); }
    } catch (err) { console.error("Unable to publish event:", err); error.textContent = eventPublishError(err); error.classList.add("visible"); }
    finally { button.disabled = false; }
  }
  async function joinEventClick(eventId, button) {
    button.disabled = true;
    try { await api.joinEvent(state.code, eventId); await refreshAll({ silent: true }); renderEvents(); toast("You're going!"); }
    catch (err) { toast(friendlyError(err)); button.disabled = false; }
  }
  async function leaveEventClick(eventId, button, rerender) {
    button.disabled = true;
    try {
      await api.leaveEvent(state.code, eventId);
      state.openEventId = null;
      await refreshAll({ silent: true });
      rerender();
      toast("You left the event");
    } catch (err) {
      toast(friendlyError(err));
      button.disabled = false;
    }
  }
  function startEventEdit(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event || event.creator_id !== state.me.id) return;
    state.editingEventId = eventId;
    const start = new Date(event.starts_at);
    $("event-title").value = event.title;
    $("event-date").value = dateInputValue(start);
    $("event-time").value = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    $("event-location").value = event.location;
    const industries = eventIndustries(event);
    $("event-industry-1").value = industries[0] || "";
    $("event-industry-2").value = industries[1] || "";
    $("event-max-participants").value = event.max_participants || 20;
    $("event-description").value = event.description || "";
    $("event-create-panel").querySelector(".section-label").textContent = "Edit event";
    $("btn-create-event").textContent = "Save event";
    $("event-create-panel").dataset.open = "true";
    state.eventPickerOpen = null;
    renderEventPickers();
    showScreen("events");
    $("event-title").focus();
  }
  async function removeEventParticipant(eventId, profileId, button) {
    button.disabled = true;
    try {
      await api.removeEventParticipant(state.code, eventId, profileId);
      await refreshAll({ silent: true });
      renderMyEvents();
      toast("Participant removed");
    } catch (err) {
      toast(friendlyError(err));
      button.disabled = false;
    }
  }
  async function cancelEvent(eventId, button) {
    button.disabled = true;
    try {
      await api.cancelEvent(state.code, eventId);
      state.openEventId = null;
      await refreshAll({ silent: true });
      renderMyEvents();
      toast("Event cancelled");
    } catch (err) {
      toast(friendlyError(err));
      button.disabled = false;
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
    $("chat-avatar").outerHTML = avatarHtml(p, "sm").replace('class="avatar sm"', 'class="avatar sm chat-profile-trigger" id="chat-avatar" role="button" tabindex="0" aria-label="View profile"');
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
    const industries = String(state.me.industry || "").split("|").map((industry) => industry.trim()).filter(Boolean);
    [1, 2, 3].forEach((number, index) => { $("pf-industry-" + number).value = industries[index] || ""; });
    $("pf-years").value = state.me.years_exp;
    $("pf-background").value = state.me.background;
    $("pf-looking").value = state.me.looking_for;
    $("profile-edit-form").hidden = !state.profileEditing;
    $("btn-edit-profile").hidden = state.profileEditing;
  }

  function startProfileEdit() {
    state.profileEditing = true;
    state.profileAvatarImage = state.me.avatar_image || null;
    $("pf-avatar-image").value = "";
    $("pf-avatar-status").textContent = state.profileAvatarImage ? "Current photo will be kept unless you choose another." : "Choose a new photo to add one.";
    renderProfileScreen();
    $("pf-name").focus();
  }

  function cancelProfileEdit() {
    state.profileEditing = false;
    $("pf-error").classList.remove("visible");
    renderProfileScreen();
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
      state.profileEditing = false;
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
    const industries = collectIndustries(prefix), background = get("background"), looking = get("looking");
    const years = parseInt($(prefix + "-years").value, 10);
    if (!name) return { error: "Please enter your name." };
    if (!title) return { error: "Please enter your job title." };
    if (!industries.length) return { error: "Please enter at least one industry." };
    if (Number.isNaN(years) || years < 0 || years > 60) return { error: "Years of experience should be between 0 and 60." };
    if (!background) return { error: "Tell people what your background is in." };
    if (!looking) return { error: "Tell people who you're looking to network with." };
    return { name, title, company, industry: industries.join(" | "), years_exp: years, background, looking_for: looking, avatar_image: state.profileAvatarImage };
  }
  function collectIndustries(prefix) {
    return [1, 2, 3].map((number) => $(prefix + "-industry-" + number).value.trim()).filter(Boolean);
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
      if (!collectIndustries("ob").length) return fail("Please enter at least one industry.");
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
        industry: collectIndustries("ob").join(" | "),
        years_exp: parseInt($("ob-years").value, 10),
        background: $("ob-background").value.trim(),
        looking_for: $("ob-looking").value.trim(),
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        avatar_image: state.onboardingAvatarImage,
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
    state.events = data.events;
    state.participants = data.participants;
    state.eventsAvailable = data.eventsAvailable !== false;

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
      const renderers = { discover: renderDiscover, events: renderEvents, "my-events": renderMyEvents, requests: renderRequests, matches: renderMatches, profile: renderProfileScreen };
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
    const sharedEventId = new URLSearchParams(window.location.search).get("event");
    if (sharedEventId && state.events.some((event) => event.id === sharedEventId)) {
      state.openEventId = sharedEventId;
      state.eventTime = "all";
      showScreen("events");
    } else {
      showScreen("discover");
    }
  }

  async function init() {
    // wire events
    $("btn-start-onboarding").addEventListener("click", () => { state.onboardingAvatarImage = null; $("ob-avatar-image").value = ""; $("ob-avatar-status").textContent = "JPG, PNG, or WebP. Your photo will be resized for Yolink."; showObStep(1); showScreen("onboarding"); });
    $("ob-avatar-image").addEventListener("change", (event) => selectProfileImage(event.currentTarget, "onboardingAvatarImage", "ob-avatar-status"));
    $("btn-goto-login").addEventListener("click", () => showScreen("login"));
    $("btn-login").addEventListener("click", doLogin);
    $("login-code").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
    $("btn-login-back").addEventListener("click", () => showScreen("welcome"));
    $("btn-ob-next").addEventListener("click", obNext);
    $("btn-ob-back").addEventListener("click", obBack);
    $("btn-copy-code").addEventListener("click", () => copyText(state.code, "Code copied — keep it safe!"));
    $("btn-code-done").addEventListener("click", enterApp);
    $("btn-profile-copy-code").addEventListener("click", () => copyText(state.code, "Code copied — keep it safe!"));
    $("btn-edit-profile").addEventListener("click", startProfileEdit);
    $("pf-avatar-image").addEventListener("change", (event) => selectProfileImage(event.currentTarget, "profileAvatarImage", "pf-avatar-status"));
    $("btn-close-photo-crop").addEventListener("click", () => closePhotoCrop(false));
    $("btn-cancel-photo-crop").addEventListener("click", () => closePhotoCrop(false));
    $("btn-use-photo").addEventListener("click", useCroppedPhoto);
    $("photo-crop-zoom").addEventListener("input", (event) => { if (state.photoCrop) { state.photoCrop.zoom = Number(event.currentTarget.value); renderPhotoCrop(); } });
    $("photo-crop-frame").addEventListener("pointerdown", (event) => {
      if (!state.photoCrop) return;
      state.photoCropDrag = { x: event.clientX, y: event.clientY, cropX: state.photoCrop.x, cropY: state.photoCrop.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    });
    $("photo-crop-frame").addEventListener("pointermove", (event) => {
      if (!state.photoCropDrag || !state.photoCrop) return;
      state.photoCrop.x = state.photoCropDrag.cropX + event.clientX - state.photoCropDrag.x;
      state.photoCrop.y = state.photoCropDrag.cropY + event.clientY - state.photoCropDrag.y;
      renderPhotoCrop();
    });
    $("photo-crop-frame").addEventListener("pointerup", () => { state.photoCropDrag = null; });
    $("photo-crop-frame").addEventListener("pointercancel", () => { state.photoCropDrag = null; });
    $("btn-save-profile").addEventListener("click", saveProfile);
    $("btn-cancel-profile-edit").addEventListener("click", cancelProfileEdit);
    $("btn-logout").addEventListener("click", logout);
    $("chat-form").addEventListener("submit", sendChatMessage);
    $("btn-chat-back").addEventListener("click", () => showScreen("matches"));
    $("btn-chat-report").addEventListener("click", () => {
      const match = state.matches.find((item) => item.id === state.openMatchId);
      const partner = match && matchPartner(match);
      if (partner) reportProfile(partner.id);
    });
    $("screen-chat").addEventListener("click", (ev) => {
      if (!ev.target.closest(".chat-profile-trigger")) return;
      const match = state.matches.find((item) => item.id === state.openMatchId);
      const partner = match && matchPartner(match);
      if (partner) showMemberProfile(partner.id);
    });
    $("screen-chat").addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      if (!ev.target.closest(".chat-profile-trigger")) return;
      ev.preventDefault();
      const match = state.matches.find((item) => item.id === state.openMatchId);
      const partner = match && matchPartner(match);
      if (partner) showMemberProfile(partner.id);
    });
    $("btn-overlay-chat").addEventListener("click", () => { const id = overlayMatchId; hideMatchOverlay(); if (id) openChat(id); });
    $("btn-overlay-close").addEventListener("click", hideMatchOverlay);
    $("btn-close-report").addEventListener("click", closeReportModal);
    $("btn-cancel-report").addEventListener("click", closeReportModal);
    $("btn-submit-report").addEventListener("click", submitReport);
    $("btn-close-member").addEventListener("click", closeMemberProfile);
    $("btn-open-requests").addEventListener("click", () => showScreen("requests"));
    $("btn-requests-back").addEventListener("click", () => showScreen("matches"));
    $("btn-open-my-events").addEventListener("click", () => showScreen("my-events"));
    $("btn-my-events-back").addEventListener("click", () => showScreen("events"));
    $("btn-show-event-form").addEventListener("click", showEventForm);
    $("btn-create-event").addEventListener("click", createEventClick);
    $("event-date-trigger").addEventListener("click", () => toggleEventPicker("date"));
    $("event-time-trigger").addEventListener("click", () => toggleEventPicker("time"));
    $("event-date-menu").addEventListener("click", (event) => {
      const monthButton = event.target.closest("[data-calendar-month]");
      if (monthButton) { state.eventCalendarCursor = new Date(state.eventCalendarCursor.getFullYear(), state.eventCalendarCursor.getMonth() + Number(monthButton.dataset.calendarMonth), 1); renderEventPickers(); return; }
      const dateButton = event.target.closest("[data-event-date]");
      if (dateButton) { $("event-date").value = dateButton.dataset.eventDate; state.eventPickerOpen = null; renderEventPickers(); }
    });
    $("event-time-menu").addEventListener("click", (event) => {
      const timeButton = event.target.closest("[data-event-time]");
      if (timeButton) { $("event-time").value = timeButton.dataset.eventTime; state.eventPickerOpen = null; renderEventPickers(); }
    });
    document.querySelectorAll(".nav-btn").forEach((btn) =>
      btn.addEventListener("click", () => showScreen(btn.dataset.screen))
    );
    [["ob-background", "ob-background-count"], ["ob-looking", "ob-looking-count"]].forEach(([inputId, countId]) => {
      $(inputId).addEventListener("input", () => { $(countId).textContent = $(inputId).value.length; });
    });

    renderEventPickers();

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
