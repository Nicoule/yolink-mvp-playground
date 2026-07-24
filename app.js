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

  const LANGUAGE_KEY = "yolink_language";
  const COPY = {
    en: {
      discover: "Discover", events: "Events", matches: "Matches", profile: "Profile", myProfile: "My profile",
      welcomeTag: "Network with intention. Meet professionals who are looking for someone like you.", createProfile: "Create my profile", browseFirst: "Browse first", haveCode: "I have a secret code, log in",
      welcomeBack: "Welcome back", loginHelp: "Enter the secret code you received when you created your profile.", secretCode: "Secret code", logIn: "Log in", back: "Back",
      basics: "First, the basics", yourName: "Your name", jobTitle: "Job title", company: "Company", hideCompany: "Don't show", gender: "Gender", profilePhoto: "Profile photo", cardColor: "Card color", optional: "(optional)", photoHelp: "JPG, PNG, or WebP. Your photo will be resized for Yolink.",
      experience: "Your experience", industries: "Industries", yearsExperience: "Years of experience", story: "Now, your story", personalityTags: "A little more about you", personalityTagsHelp: "(pick up to 3)", personalityTagsLimit: "Choose up to 3 tags.", customTag: "Your own tag", customTagPlaceholder: "e.g. Weekend hiker", next: "Next", saveCode: "Save your secret code", copyCode: "Copy code", startBrowsing: "I saved it — start browsing", shareYolink: "↗ Share Yolink", yolinkLinkCopiedToast: "Yolink's link is copied — share it with your friends 😄",
      myEvents: "My events", createEvent: "Create an event", requests: "Requests", report: "Report", accept: "Accept", pass: "Pass", letsNetwork: "🤝 Let's network", requestSent: "Requested ✓", requestSentToast: "Request sent 🤝", addRequestNote: "Add a note", requestNoteHelp: "Add an optional message for this person to see with your connection request.", requestMessage: "Message", sendRequest: "Send request", outgoingRequests: "Sent by you", requestPending: "Pending", completeProfileTitle: "Ready to connect?", completeProfileHelp: "Create your profile to send connection requests, join events, and create your own events.", completeProfile: "Complete my profile", keepBrowsing: "Keep browsing", officialAccount: "Official account", defaultNetworkRequest: "wants to network with you", matchPreviewMutual: "You matched — say hello!", matchPreviewStaff: "Matched by the Yolink team — say hello!", matchOverlayMutual: "both want to connect.", matchOverlayStaff: "The Yolink team thinks you should talk.", chooseYears: "Choose years of experience", noRequestsHelp: "When someone wants to connect with you, they'll show up here.", noMatchesHelp: "Accept a connection request, or wait for a request you've sent to be accepted; your conversations will appear here.", send: "Send", editProfile: "Edit profile", saveChanges: "Save changes", cancel: "Cancel", logOut: "Log out",
      eventsSub: "Make plans with the Yolink community.", refresh: "Refresh", pullToRefresh: "Pull down to refresh", releaseToRefresh: "Release to refresh", refreshing: "Refreshing…", discoverRefreshedToast: "Discover is up to date.", eventsRefreshedToast: "Events are up to date.", languageButton: "中文", languageName: "English",
      photoAdjust: "Adjust your photo", photoAdjustHelp: "Drag to reposition, then use the slider to zoom.", choosePhoto: "Choose a photo", zoom: "Zoom", usePhoto: "Use photo",
      copyEventLink: "Copy event link", quitEvent: "Quit event", cancelEvent: "Cancel event", editEvent: "Edit event", newEvent: "New event", publishEvent: "Publish event", saveEvent: "Save event", joinEvent: "Join event", eventFull: "Event is full", eventEnded: "Event ended", eventVisibility: "Who can see this event?", visibilityPublic: "Everyone can see", visibilityConnectToJoin: "Connect to join", visibilityConnectionsOnly: "Connections only", visibilityUnlisted: "Share link only", visibilityPublicHelp: "Anyone can discover and join this event.", visibilityConnectToJoinHelp: "Anyone can see it, but only your connections can join.", visibilityConnectionsOnlyHelp: "Only people connected with you can discover and join.", visibilityUnlistedHelp: "Only people with the event link can view and join.", connectToJoin: "Connect with the host to join", onlineEvent: "Online event", onlineEventLink: "Online event link", joinOnlineEvent: "Open online event link", onlineEventUrlRequired: "Please enter a valid online event link.", eventPublishedToast: "Event published 🎉", eventUpdatedToast: "Event updated ✓", copiedToast: "Copied!", copyFailedToast: "Couldn't copy — select it manually.", codeCopiedToast: "Code copied — keep it safe!", eventLinkCopiedToast: "Event link copied!", reportSentToast: "Thanks — your report was sent to the Yolink team.", alreadyReportedToast: "You've already reported this user. Our team is reviewing it.", coffeeRequestedToast: "Coffee chat requested ☕", joinedEventToast: "You're going!", leftEventToast: "You left the event", participantRemovedToast: "Participant removed", eventCancelledToast: "Event cancelled", requestPassedToast: "Passed — no hard feelings.", profileSavedToast: "Profile saved ✓", newMessageFrom: "New message from", chooseIndustry: "Choose an industry", addIndustry: "Add another industry (optional)", clearIndustry: "Clear selection", nameRequired: "Please enter your name.", titleRequired: "Please enter your job title.", industryRequired: "Please enter at least one industry.", yearsRequired: "Please choose your years of experience.", backgroundRequired: "Tell people what your background is in.", lookingForRequired: "Tell people who you're looking to network with.", reportReasonRequired: "Please briefly describe the issue.", eventRequiredDetails: "Please add an event name, date, time, and location.", eventIndustryRequired: "Choose at least one industry for this event.", eventCapacityInvalid: "Maximum participants should be between 1 and 500."
    },
    zh: {
      discover: "发现", events: "活动", matches: "匹配", profile: "个人资料", myProfile: "我的资料",
      welcomeTag: "有目的地拓展人脉，认识正在寻找合适连接的专业人士。", createProfile: "创建我的资料", browseFirst: "先逛逛", haveCode: "我有专属代码，去登录",
      welcomeBack: "欢迎回来", loginHelp: "输入创建个人资料时收到的专属代码。", secretCode: "专属代码", logIn: "登录", back: "返回",
      basics: "先了解一下你", yourName: "姓名", jobTitle: "职位", company: "公司", hideCompany: "不显示", gender: "性别", profilePhoto: "头像", cardColor: "名片颜色", optional: "（可选）", photoHelp: "支持 JPG、PNG 或 WebP。Yolink 会自动压缩照片。",
      experience: "你的经验", industries: "行业", yearsExperience: "工作年限", story: "介绍一下你自己", personalityTags: "再介绍一下你自己", personalityTagsHelp: "（最多选择 3 个）", personalityTagsLimit: "最多选择 3 个标签。", customTag: "我的自定义标签", customTagPlaceholder: "例如：周末徒步爱好者", next: "下一步", saveCode: "保存你的专属代码", copyCode: "复制代码", startBrowsing: "我已保存，开始浏览", shareYolink: "↗ 分享 Yolink", yolinkLinkCopiedToast: "已复制 Yolink 的链接，快去分享给好友吧😄",
      myEvents: "我的活动", createEvent: "创建活动", requests: "请求", report: "举报", accept: "接受", pass: "忽略", letsNetwork: "🤝发起连接", requestSent: "已发送 ✓", requestSentToast: "连接请求已发送 🤝", addRequestNote: "添加留言", requestNoteHelp: "可选填写一段留言，对方会在收到连接请求时看到。", requestMessage: "留言", sendRequest: "发送请求", outgoingRequests: "由你发起", requestPending: "等待对方回应", completeProfileTitle: "完善资料后即可行动", completeProfileHelp: "创建个人资料后，即可发起连接、参加活动和创建自己的活动。", completeProfile: "去完善资料", keepBrowsing: "继续浏览", officialAccount: "官方", defaultNetworkRequest: "想与你建立连接", matchPreviewMutual: "你们已匹配成功，打个招呼吧！", matchPreviewStaff: "Yolink 团队为你推荐了这位匹配对象，打个招呼吧！", matchOverlayMutual: "都想建立连接。", matchOverlayStaff: "Yolink 团队认为你们值得聊一聊。", chooseYears: "选择工作年限", noRequestsHelp: "当有人想与你建立连接时，他们的请求会显示在这里。", noMatchesHelp: "接受连接请求，或等待已发起的请求；你们的对话会显示在这里。", send: "发送", editProfile: "编辑资料", saveChanges: "保存更改", cancel: "取消", logOut: "退出登录",
      eventsSub: "与 Yolink 社群一起制定计划。", refresh: "刷新", pullToRefresh: "下拉刷新", releaseToRefresh: "松开即可刷新", refreshing: "正在刷新…", discoverRefreshedToast: "发现页已更新。", eventsRefreshedToast: "活动页已更新。", languageButton: "EN", languageName: "中文",
      photoAdjust: "调整你的照片", photoAdjustHelp: "拖动照片调整位置，再用滑杆缩放。", choosePhoto: "选择照片", zoom: "缩放", usePhoto: "使用此照片",
      copyEventLink: "复制活动链接", quitEvent: "退出活动", cancelEvent: "取消活动", editEvent: "编辑活动", newEvent: "新活动", publishEvent: "发布活动", saveEvent: "保存活动", joinEvent: "参加活动", eventFull: "活动已满", eventEnded: "活动已结束", eventVisibility: "活动可见范围", visibilityPublic: "所有人可见", visibilityConnectToJoin: "连接后可参与", visibilityConnectionsOnly: "仅联系人可见", visibilityUnlisted: "仅分享邀请", visibilityPublicHelp: "所有用户都可以发现并参加此活动。", visibilityConnectToJoinHelp: "所有用户都能看到，但只有与你成功连接的用户可以参加。", visibilityConnectionsOnlyHelp: "只有与你成功连接的用户可以发现并参加。", visibilityUnlistedHelp: "只有获得活动分享链接的用户可以查看和参加。", connectToJoin: "先与主办人连接后再参加", onlineEvent: "线上活动", onlineEventLink: "线上活动链接", joinOnlineEvent: "打开线上活动链接", onlineEventUrlRequired: "请输入有效的线上活动链接。", eventPublishedToast: "活动已发布 🎉", eventUpdatedToast: "活动已更新 ✓", copiedToast: "已复制！", copyFailedToast: "复制失败，请手动选择并复制。", codeCopiedToast: "专属代码已复制，请妥善保存！", eventLinkCopiedToast: "活动链接已复制！", reportSentToast: "感谢你的反馈，举报已发送给 Yolink 团队。", alreadyReportedToast: "您已经举报过该用户，团队正在审核中。", coffeeRequestedToast: "咖啡交流请求已发送 ☕", joinedEventToast: "你已参加活动！", leftEventToast: "你已退出活动", participantRemovedToast: "参与者已移除", eventCancelledToast: "活动已取消", requestPassedToast: "已忽略该请求。", profileSavedToast: "资料已保存 ✓", newMessageFrom: "收到来自以下用户的新消息：", chooseIndustry: "选择行业", addIndustry: "添加另一个行业（可选）", clearIndustry: "清除选择", nameRequired: "请填写姓名。", titleRequired: "请填写职位。", industryRequired: "请至少选择一个行业。", yearsRequired: "请选择工作年限。", backgroundRequired: "请介绍一下你的背景。", lookingForRequired: "请说明你希望结识什么样的人。", reportReasonRequired: "请简要说明举报原因。", eventRequiredDetails: "请填写活动名称、日期、时间和地点。", eventIndustryRequired: "请至少选择一个活动行业。", eventCapacityInvalid: "参与人数上限应在 1 至 500 人之间。"
    }
  };
  Object.assign(COPY.en, {
    shareEvent: "Share event", sendToChat: "Send to a conversation", chooseConversation: "Choose a match", copyLink: "Copy link",
    eventInvite: "Event invitation", eventInviteSent: "Event invitation sent", noMatchesToShare: "Match with someone first to send an event invitation.",
    eventNoLongerAvailable: "This event is no longer available", eventInviteMessage: "I wanted to share this event with you — come take a look!",
    locationSearchHelp: "Start typing to search for a place.", locationSearching: "Searching places…", locationNoResults: "No matching places found. You can still enter a location manually."
  });
  Object.assign(COPY.zh, {
    shareEvent: "分享活动", sendToChat: "发送到聊天", chooseConversation: "选择一位匹配对象", copyLink: "复制链接",
    eventInvite: "活动邀请", eventInviteSent: "活动邀请已发送", noMatchesToShare: "先与其他用户建立连接，即可向对方发送活动邀请。",
    eventNoLongerAvailable: "该活动已不可用", eventInviteMessage: "我想和你分享这个活动，快来看看吧！",
    locationSearchHelp: "输入地点名称或地址，即可搜索并选择地点。", locationSearching: "正在搜索地点…", locationNoResults: "未找到匹配地点，你仍可手动填写地点。"
  });
  function t(key, fallback) { return COPY[state.language]?.[key] || fallback || COPY.en[key] || key; }
  const INDUSTRY_ZH = { Technology: "科技", Healthcare: "医疗健康", Finance: "金融", Consulting: "咨询", Education: "教育", Marketing: "市场营销", Design: "设计", Legal: "法律", Manufacturing: "制造业", "Real Estate": "房地产", "Media & Entertainment": "媒体与娱乐", Nonprofit: "非营利组织", Other: "其他", General: "综合" };
  const INDUSTRY_OPTIONS = ["Technology", "Healthcare", "Finance", "Consulting", "Education", "Marketing", "Design", "Legal", "Manufacturing", "Real Estate", "Media & Entertainment", "Nonprofit", "Other"];
  const PERSONALITY_TAGS = [
    ["coffee", "☕ Coffee lover", "☕ 咖啡爱好者"], ["city", "✈️ Exploring cities", "✈️ 城市探索中"],
    ["sharing", "🎤 Loves sharing ideas", "🎤 乐于分享经验"], ["ideas", "💡 Full of ideas", "💡 点子很多"],
    ["exploring", "🌱 Exploring new directions", "🌱 正在转型 / 探索新方向"], ["friends", "🤝 Meeting new people", "🤝 认识新朋友"],
    ["learning", "📚 Lifelong learner", "📚 终身学习者"], ["creative", "🎨 Creates beyond work", "🎨 工作之外也爱创作"],
    ["innovation", "🚀 Into startups & innovation", "🚀 创业与创新关注者"], ["culture", "🌍 Cross-cultural connector", "🌍 喜欢跨文化交流"]
  ];
  const YEARS_OPTIONS = [...Array.from({ length: 11 }, (_, value) => value), 11];
  const GENDER_OPTIONS = [
    ["woman", "Woman", "女性"], ["man", "Man", "男性"], ["nonbinary", "Non-binary", "非二元性别"], ["prefer_not_to_say", "Prefer not to say", "不愿透露"]
  ];
  function genderLabel(value) {
    const option = GENDER_OPTIONS.find(([key]) => key === value) || GENDER_OPTIONS.at(-1);
    return state.language === "zh" ? option[2] : option[1];
  }
  function personalityTagLabel(value) {
    const option = PERSONALITY_TAGS.find(([key]) => key === value);
    return option ? (state.language === "zh" ? option[2] : option[1]) : "";
  }
  function parsedPersonalityTags(value) {
    const allowed = new Set(PERSONALITY_TAGS.map(([key]) => key));
    return [...new Set(String(value || "").split("|").map((tag) => tag.trim()).filter((tag) => allowed.has(tag)))].slice(0, 3);
  }
  function renderPersonalityTagPicker(prefix) {
    const input = $(prefix + "-personality-tags");
    const picker = $(prefix + "-personality-tag-picker");
    if (!input || !picker) return;
    const selected = parsedPersonalityTags(input.value);
    input.value = selected.join(" | ");
    picker.innerHTML = PERSONALITY_TAGS.map(([key]) => `<button type="button" class="personality-tag-option ${selected.includes(key) ? "selected" : ""}" data-personality-tag="${esc(key)}" aria-pressed="${selected.includes(key)}">${esc(personalityTagLabel(key))}</button>`).join("");
    picker.querySelectorAll("[data-personality-tag]").forEach((button) => button.addEventListener("click", () => {
      const tag = button.dataset.personalityTag;
      const next = selected.includes(tag) ? selected.filter((item) => item !== tag) : selected.length < 3 ? [...selected, tag] : null;
      if (!next) { toast(t("personalityTagsLimit")); return; }
      input.value = next.join(" | ");
      renderPersonalityTagPicker(prefix);
    }));
  }
  function renderGenderPickers() {
    ["ob", "pf"].forEach((prefix) => {
      const input = $(prefix + "-gender");
      const trigger = $(prefix + "-gender-trigger");
      const menu = $(prefix + "-gender-menu");
      if (!input || !trigger || !menu) return;
      const open = state.profileGenderPickerOpen === prefix;
      trigger.textContent = genderLabel(input.value);
      menu.hidden = !open;
      menu.innerHTML = open ? GENDER_OPTIONS.map(([value]) => `<button data-gender-picker="${prefix}" data-gender-value="${value}" class="${input.value === value ? "selected" : ""}">${esc(genderLabel(value))}</button>`).join("") : "";
    });
  }
  function renderCardColorPickers() {
    ["ob", "pf"].forEach((prefix) => {
      const input = $(prefix + "-card-color");
      const picker = $(prefix + "-card-color-picker");
      if (!input || !picker) return;
      if (!AVATAR_COLORS.includes(input.value)) input.value = AVATAR_COLORS[0];
      picker.innerHTML = AVATAR_COLORS.map((color, index) => `<button type="button" class="card-color-option ${input.value === color ? "selected" : ""}" data-card-color-picker="${prefix}" data-card-color="${color}" style="--swatch:${color}" aria-label="${esc(state.language === "zh" ? `名片颜色 ${index + 1}` : `Card color ${index + 1}`)}" aria-pressed="${input.value === color}"></button>`).join("");
    });
  }
  function yearsPickerLabel(value) {
    if (value === "") return t("chooseYears");
    const years = Number(value);
    if (years >= 11) return state.language === "zh" ? "10 年以上" : "10+ years";
    return state.language === "zh" ? `${years} 年` : `${years} year${years === 1 ? "" : "s"}`;
  }
  function renderOnboardingExperiencePickers() {
    [1, 2, 3].forEach((number) => {
      const input = $("ob-industry-" + number);
      const trigger = $("ob-industry-" + number + "-trigger");
      const menu = $("ob-industry-" + number + "-menu");
      if (!input || !trigger || !menu) return;
      const open = state.onboardingExperiencePickerOpen === "industry-" + number;
      const choices = availableIndustryOptions(input.value, [1, 2, 3].filter((item) => item !== number).map((item) => $("ob-industry-" + item).value));
      trigger.textContent = input.value ? industryLabel(input.value) : t(number === 1 ? "chooseIndustry" : "addIndustry");
      menu.hidden = !open;
      menu.innerHTML = open
        ? choices.map((industry) => `<button data-onboarding-industry="${number}" data-industry-value="${esc(industry)}" class="${normalizeIndustry(input.value) === industry ? "selected" : ""}">${esc(industryLabel(industry))}</button>`).join("") + (number > 1 && input.value ? `<button class="clear-industry" data-onboarding-industry="${number}" data-industry-value="">${esc(t("clearIndustry"))}</button>` : "")
        : "";
    });
    const years = $("ob-years");
    const yearsTrigger = $("ob-years-trigger");
    const yearsMenu = $("ob-years-menu");
    if (!years || !yearsTrigger || !yearsMenu) return;
    const yearsOpen = state.onboardingExperiencePickerOpen === "years";
    yearsTrigger.textContent = yearsPickerLabel(years.value);
    yearsMenu.hidden = !yearsOpen;
    yearsMenu.innerHTML = yearsOpen
      ? YEARS_OPTIONS.map((value) => `<button data-onboarding-years="${value}" class="${String(value) === years.value ? "selected" : ""}">${esc(yearsPickerLabel(String(value)))}</button>`).join("")
      : "";
  }
  function renderProfileExperiencePickers() {
    [1, 2, 3].forEach((number) => {
      const input = $("pf-industry-" + number);
      const trigger = $("pf-industry-" + number + "-trigger");
      const menu = $("pf-industry-" + number + "-menu");
      if (!input || !trigger || !menu) return;
      const open = state.profileExperiencePickerOpen === "industry-" + number;
      const choices = availableIndustryOptions(input.value, [1, 2, 3].filter((item) => item !== number).map((item) => $("pf-industry-" + item).value));
      trigger.textContent = input.value ? industryLabel(input.value) : t(number === 1 ? "chooseIndustry" : "addIndustry");
      menu.hidden = !open;
      menu.innerHTML = open
        ? choices.map((industry) => `<button data-profile-industry="${number}" data-industry-value="${esc(industry)}" class="${normalizeIndustry(input.value) === industry ? "selected" : ""}">${esc(industryLabel(industry))}</button>`).join("") + (number > 1 && input.value ? `<button class="clear-industry" data-profile-industry="${number}" data-industry-value="">${esc(t("clearIndustry"))}</button>` : "")
        : "";
    });
    const years = $("pf-years");
    const trigger = $("pf-years-trigger");
    const menu = $("pf-years-menu");
    if (!years || !trigger || !menu) return;
    const open = state.profileExperiencePickerOpen === "years";
    trigger.textContent = yearsPickerLabel(years.value);
    menu.hidden = !open;
    menu.innerHTML = open
      ? YEARS_OPTIONS.map((value) => `<button data-profile-years="${value}" class="${String(value) === years.value ? "selected" : ""}">${esc(yearsPickerLabel(String(value)))}</button>`).join("")
      : "";
  }
  function normalizeIndustry(industry) {
    const value = String(industry || "").trim();
    if (!value) return "";
    const lower = value.toLocaleLowerCase();
    return INDUSTRY_OPTIONS.find((option) => option.toLocaleLowerCase() === lower)
      || Object.entries(INDUSTRY_ZH).find(([, label]) => label === value)?.[0]
      || value;
  }
  function uniqueIndustries(values) {
    const seen = new Set();
    return values.map(normalizeIndustry).filter((industry) => {
      const key = industry.toLocaleLowerCase();
      if (!industry || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function parsedIndustries(value) {
    return uniqueIndustries(String(value || "").split("|"));
  }
  function availableIndustryOptions(currentValue, otherValues = []) {
    const selectedElsewhere = new Set(uniqueIndustries(otherValues).map((industry) => industry.toLocaleLowerCase()));
    const current = normalizeIndustry(currentValue);
    return INDUSTRY_OPTIONS.filter((industry) => industry === current || !selectedElsewhere.has(industry.toLocaleLowerCase()));
  }
  function industryLabel(industry) {
    const normalized = normalizeIndustry(industry);
    return state.language === "zh" ? (INDUSTRY_ZH[normalized] || normalized) : normalized;
  }
  function renderIndustryOptions() {
    const list = $("industry-options");
    if (!list) return;
    list.innerHTML = INDUSTRY_OPTIONS.map((industry) => `<option value="${esc(state.language === "zh" ? industryLabel(industry) : industry)}"></option>`).join("");
  }
  function experienceLabel(years) {
    if (Number(years) >= 11) return state.language === "zh" ? "10 年以上经验" : "10+ years experience";
    return state.language === "zh" ? `${years} 年经验` : `${years} yr${years === 1 ? "" : "s"} experience`;
  }
  const ZH_UI = {
    "Network with intention. Meet professionals who are looking for someone like you.": "有目的地拓展人脉，认识正在寻找合适连接的专业人士。",
    "Create my profile": "创建我的资料", "I have a secret code": "我有专属代码", "Welcome back": "欢迎回来", "Enter the secret code you received when you created your profile.": "输入创建个人资料时收到的专属代码。",
    "Secret code": "专属代码", "Log in": "登录", "Back": "返回", "First, the basics": "先了解一下你", "Your name": "姓名", "Job title": "职位", "Company": "公司", "Profile photo": "头像", "(optional)": "（可选）",
    "JPG, PNG, or WebP. Your photo will be resized for Yolink.": "支持 JPG、PNG 或 WebP。Yolink 会自动压缩照片。", "Your experience": "你的经验", "Industries": "行业", "Years of experience": "工作年限", "Now, your story": "介绍一下你自己", "Next": "下一步",
    "My background is in…": "我的背景是…", "I'm looking to network with…": "我希望结识…", "Primary industry": "主要行业", "Second industry (optional)": "第二行业（可选）", "Third industry (optional)": "第三行业（可选）", "(up to 2)": "（最多 2 个）",
    "Save your secret code": "保存你的专属代码", "Copy code": "复制代码", "I saved it — start browsing": "我已保存，开始浏览", "Discover": "发现", "Events": "活动", "My events": "我的活动", "Requests": "请求", "Matches": "匹配", "My profile": "我的资料", "Profile": "个人资料",
    "This code is the only way to get back into your profile — there's no email recovery. Screenshot it or save it somewhere safe.": "这是返回你个人资料的唯一方式，无法通过邮箱找回。请截图或保存到安全的位置。",
    "Make plans with the Yolink community.": "与 Yolink 社群一起制定计划。", "Create an event": "创建活动", "New event": "新活动", "Event name": "活动名称", "When": "时间", "Date": "日期", "Pick a date": "选择日期", "Time": "时间", "Choose time": "选择时间", "Location": "地点",
    "Event industries": "活动行业", "Maximum participants": "参与人数上限", "What should people know?": "活动说明", "Publish event": "发布活动", "Everything you’re hosting or attending, past and upcoming.": "你主办或参加过的所有活动，包括即将开始和已结束的活动。", "Coffee & careers": "咖啡与职业交流", "e.g. Technology": "例如：科技", "A relaxed hour to meet other people in the pool.": "轻松的一小时，认识社群里的其他人。",
    "Filter by date": "按日期筛选", "All dates": "所有日期", "Upcoming": "即将开始", "Past": "已结束", "All industries": "所有行业", "Industry": "行业", "All time": "所有时间", "Today": "今天", "This week": "本周",
    "Event host": "活动主办方", "Participants": "参与者", "Edit event": "编辑活动", "Cancel event": "取消活动", "Quit event": "退出活动", "Join event": "参加活动", "Event is full": "活动已满", "Event ended": "活动已结束", "Copy event link": "复制活动链接", "← Close details": "← 收起详情",
    "Report": "举报", "Let's network": "发起连接", "🤝 Let's network": "🤝发起连接", "Send": "发送", "Say hello…": "打个招呼…", "Your secret code": "你的专属代码", "Edit profile": "编辑资料", "Save changes": "保存更改", "Cancel": "取消", "Log out": "退出登录",
    "Adjust your photo": "调整你的照片", "Drag to reposition, then use the slider to zoom.": "拖动照片调整位置，再用滑杆缩放。", "Zoom": "缩放", "Use photo": "使用此照片", "Photo ready ✓": "照片已准备好 ✓", "Preparing photo…": "正在处理照片…",
    "No events yet": "暂无活动", "No matching events": "没有符合条件的活动", "No events here yet": "这里还没有活动", "Upcoming": "即将开始", "Past events": "已结束的活动", "Hosting": "主办", "Going": "已参加", "You're going ✓": "你已参加 ✓",
    "Be the person who gets the first gathering on the calendar.": "成为第一个发起活动的人吧。", "Try widening your industry or time filter.": "试试放宽行业或时间筛选条件。", "Events you host or join will be collected here.": "你主办或参加的活动都会汇总在这里。", "Try a different date filter.": "试试其他日期筛选条件。",
    "No requests yet": "暂无请求", "No matches yet": "暂无匹配", "No messages yet": "暂无消息", "You matched!": "匹配成功！", "Say hello": "打个招呼", "Keep browsing": "继续浏览",
    "No matching members": "没有符合条件的用户", "Try widening one of your filters.": "试试放宽筛选条件。", "The pool is warming up": "社群正在成长", "No one else here yet — invite a few friends to create profiles.": "这里暂时还没有其他人，邀请朋友来创建资料吧。",
    "All experience": "所有经验", "0–2 years": "0–2 年", "3–5 years": "3–5 年", "6–10 years": "6–10 年", "10+ years": "10 年以上", "Experience": "经验",
    "That code didn't match any profile. Check it and try again.": "这个代码没有对应的个人资料，请检查后重试。", "You already sent them a request — hang tight!": "你已经发送过请求，请耐心等待。", "You're already matched with them.": "你们已经匹配成功。", "That's you!": "这是你自己！", "This request isn't yours to answer.": "这不是需要你处理的请求。", "This request was already answered.": "这个请求已经处理过了。", "You're not part of this conversation.": "你不在这段对话中。", "That event is no longer available.": "该活动已不可用。", "You're already going to this event.": "你已经参加了这个活动。", "This event has reached its participant limit.": "该活动已达到人数上限。", "This event has already ended.": "该活动已经结束。", "Only the event host can make that change.": "只有活动主办方可以进行此操作。", "The event host can't be removed from their own event.": "活动主办方不能移除自己。", "That participant is no longer part of this event.": "该参与者已不在活动中。", "The maximum can't be below the number of people already going.": "人数上限不能低于当前参与人数。", "Only upcoming events can be cancelled.": "只能取消尚未开始的活动。",
    "Report profile": "举报用户", "Tell the Yolink team what happened with": "向 Yolink 团队说明发生了什么", "Briefly describe the issue": "简要说明问题", "What should the team know?": "团队需要了解什么？", "Submit report": "提交举报", "Choose a new photo to replace your current one.": "选择新照片以替换当前头像。", "Current photo will be kept unless you choose another.": "除非选择新照片，否则将保留当前头像。", "Choose a new photo to add one.": "选择一张新照片作为头像。"
  };
  function localizedText(value) {
    const map = state.language === "zh" ? ZH_UI : Object.fromEntries(Object.entries(ZH_UI).map(([en, zh]) => [zh, en]));
    if (map[value]) return map[value];
    if (state.language === "zh") {
      let match = value.match(/^(\d+) \/ (\d+) going$/); if (match) return `${match[1]} / ${match[2]} 人参加`;
      match = value.match(/^Participants · (\d+) of (\d+)$/); if (match) return `参与者 · ${match[1]} / ${match[2]}`;
      match = value.match(/^(\d+) (person|people) going$/); if (match) return `${match[1]} 人参加`;
    }
    return value;
  }
  function localizeUi() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, textarea, option")) return;
      const translated = localizedText(node.nodeValue.trim());
      if (translated !== node.nodeValue.trim()) node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), translated);
    });
    document.querySelectorAll("[placeholder], [aria-label]").forEach((element) => {
      ["placeholder", "aria-label"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, localizedText(value));
      });
    });
  }
  function applyLanguage() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.title = state.language === "zh" ? "Yolink — 有目的地拓展人脉" : "Yolink — Network with intention";
    const labels = {
      "nav-discover-label": "discover", "nav-events-label": "events", "nav-matches-label": "matches", "nav-profile-label": "profile",
      "profile-screen-title": "myProfile", "btn-start-onboarding": "createProfile", "btn-browse-first": "browseFirst", "btn-ob-browse": "browseFirst", "btn-goto-login": "haveCode", "ob-avatar-upload": "choosePhoto", "pf-avatar-upload": "choosePhoto",
      "screen-welcome .welcome-tag": "welcomeTag", "label[for='login-code']": "secretCode",
      "screen-login h1": "welcomeBack", "screen-login .screen-sub": "loginHelp", "btn-login": "logIn", "btn-login-back": "back", "btn-share-yolink": "shareYolink",
      "ob-step-1 h1": "basics", "ob-step-2 h1": "experience", "ob-step-3 h1": "story", "btn-ob-next": "next", "btn-ob-back": "back",
      "label[for='ob-name']": "yourName", "label[for='ob-title']": "jobTitle", "label[for='ob-company']": "company", "ob-hide-company-label": "hideCompany", "ob-gender-label": "gender", "label[for='ob-avatar-image']": "profilePhoto", "ob-card-color-label": "cardColor", "ob-avatar-status": "photoHelp",
      "ob-industries-label": "industries", "ob-years-label": "yearsExperience", "label[for='pf-name']": "yourName", "label[for='pf-title']": "jobTitle", "label[for='pf-company']": "company", "pf-hide-company-label": "hideCompany", "pf-gender-label": "gender", "label[for='pf-avatar-image']": "profilePhoto", "pf-card-color-label": "cardColor", "pf-industries-label": "industries", "pf-years-label": "yearsExperience",
      "screen-code h1": "saveCode", "btn-copy-code": "copyCode", "btn-code-done": "startBrowsing",
      "screen-events h1": "events", "btn-open-my-events": "myEvents", "screen-events .screen-sub": "eventsSub", "btn-show-event-form": "createEvent", "btn-create-my-event": "createEvent", "btn-cancel-event-form": "cancel",
      "screen-my-events h1": "myEvents", "screen-requests h1": "requests", "screen-matches h1": "matches", "btn-chat-report": "report", "chat-form button": "send", "request-modal-title": "addRequestNote", "request-modal-help": "requestNoteHelp", "request-message-label": "requestMessage", "btn-submit-request": "sendRequest", "btn-cancel-request": "cancel", "profile-gate-title": "completeProfileTitle", "profile-gate-help": "completeProfileHelp", "btn-complete-profile": "completeProfile", "btn-keep-browsing": "keepBrowsing",
      "btn-profile-copy-code": "copyCode", "btn-edit-profile": "editProfile", "btn-save-profile": "saveChanges", "btn-cancel-profile-edit": "cancel", "btn-logout": "logOut",
      "photo-crop-title": "photoAdjust", "photo-crop-modal .photo-crop-dialog > p": "photoAdjustHelp", "photo-crop-modal .photo-zoom-label": "zoom", "btn-use-photo": "usePhoto", "btn-cancel-photo-crop": "cancel"
    };
    for (const [target, key] of Object.entries(labels)) {
      const element = target.includes(" ") || target.includes(".") || target.includes("[") ? document.querySelector("#" + target) || document.querySelector(target) : $(target);
      if (element) element.textContent = t(key);
    }
    if ($("event-online-label")) $("event-online-label").textContent = t("onlineEvent");
    if ($("event-online-url-label")) $("event-online-url-label").innerHTML = `${esc(t("onlineEventLink"))} <span class="required-mark" aria-hidden="true">*</span>`;
    if ($("event-visibility-label")) $("event-visibility-label").textContent = t("eventVisibility");
    if ($("event-location-help")) $("event-location-help").textContent = t("locationSearchHelp");
    if ($("event-share-title")) $("event-share-title").textContent = t("shareEvent");
    if ($("event-share-help")) $("event-share-help").textContent = state.language === "zh" ? "将活动以邀请卡片发送到聊天，或复制活动链接。" : "Send this event as an invitation card, or copy its link.";
    if ($("btn-send-event-invite")) $("btn-send-event-invite").textContent = t("sendToChat");
    if ($("btn-copy-event-link")) $("btn-copy-event-link").textContent = t("copyLink");
    if ($("btn-cancel-event-share")) $("btn-cancel-event-share").textContent = t("cancel");
    ["ob", "pf"].forEach((prefix) => {
      const label = $(prefix + "-personality-tags-label");
      if (label) label.innerHTML = `${esc(t("personalityTags"))} <span class="hint">${esc(t("personalityTagsHelp"))}</span>`;
      const customLabel = $(prefix + "-custom-tag-label");
      if (customLabel) customLabel.innerHTML = `${esc(t("customTag"))} <span class="hint">${esc(t("optional"))}</span>`;
      const customInput = $(prefix + "-custom-tag");
      if (customInput) customInput.placeholder = t("customTagPlaceholder");
      renderPersonalityTagPicker(prefix);
    });
    const loginCode = $("login-code");
    if (loginCode) loginCode.setAttribute("aria-label", t("secretCode"));
    const refreshButton = $("btn-refresh-discover");
    if (refreshButton) {
      refreshButton.setAttribute("aria-label", t("refresh"));
      refreshButton.setAttribute("title", t("refresh"));
    }
    const codeHelp = $("code-help");
    if (codeHelp) codeHelp.innerHTML = state.language === "zh"
      ? "这是返回你个人资料的<strong>唯一</strong>方式，无法通过邮箱找回。请截图或保存到安全的位置；之后登录后，也可在「我的资料」页面查看。"
      : "This code is the <strong>only</strong> way to get back into your profile — there's no email recovery. Screenshot it or save it somewhere safe. You can also find it later in My profile.";
    document.querySelectorAll("[data-language-toggle]").forEach((button) => { button.textContent = t("languageButton"); });
    document.querySelectorAll(".nav-btn").forEach((button) => button.setAttribute("aria-label", t(button.dataset.screen)));
    renderIndustryOptions();
    renderGenderPickers();
    renderCardColorPickers();
    renderOnboardingExperiencePickers();
    renderProfileExperiencePickers();
    localizeUi();
  }

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

  const AVATAR_COLORS = ["#c77dd4", "#ef7fb8", "#ffab40", "#56b6f0", "#3ecf8e", "#f2905a", "#8b8ff0", "#e6b84d", "#f06b85"];

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
    EVENT_ENDED: "This event has already ended.",
    EVENT_CONNECTION_REQUIRED: "Connect with the event host before joining.",
    EVENT_NOT_VISIBLE: "You don't have access to share this event.",
    NOT_EVENT_HOST: "Only the event host can make that change.",
    CANNOT_REMOVE_HOST: "The event host can't be removed from their own event.",
    PARTICIPANT_NOT_FOUND: "That participant is no longer part of this event.",
    CAPACITY_TOO_LOW: "The maximum can't be below the number of people already going.",
    EVENT_ALREADY_STARTED: "Only upcoming events can be cancelled.",
    SELF_REPORT: "You can't report your own profile.",
    ALREADY_REPORTED: "You've already reported this user. Our team is reviewing it.",
  };
  const ERROR_MESSAGES_ZH = {
    INVALID_CODE: "这个代码没有对应的个人资料，请检查后重试。",
    ALREADY_REQUESTED: "你已经发送过连接请求，请耐心等待。",
    ALREADY_MATCHED: "你们已经匹配成功。",
    SELF_REQUEST: "不能向自己发起连接。",
    NOT_YOUR_REQUEST: "这不是需要你处理的请求。",
    ALREADY_HANDLED: "这个请求已经处理过了。",
    NOT_YOUR_MATCH: "你不在这段对话中。",
    EVENT_NOT_FOUND: "该活动已不可用。",
    ALREADY_JOINED: "你已经参加了这个活动。",
    EVENT_FULL: "该活动已达到人数上限。",
    EVENT_ENDED: "该活动已经结束。",
    EVENT_CONNECTION_REQUIRED: "请先与活动主办人建立连接后再参加。",
    EVENT_NOT_VISIBLE: "你暂时没有权限分享此活动。",
    NOT_EVENT_HOST: "只有活动主办方可以进行此操作。",
    CANNOT_REMOVE_HOST: "活动主办方不能移除自己。",
    PARTICIPANT_NOT_FOUND: "该参与者已不在活动中。",
    CAPACITY_TOO_LOW: "人数上限不能低于当前参与人数。",
    EVENT_ALREADY_STARTED: "只能取消尚未开始的活动。",
    SELF_REPORT: "你不能举报自己的资料。",
    ALREADY_REPORTED: "您已经举报过该用户，团队正在审核中。",
  };
  function friendlyError(err) {
    const msg = err?.message || String(err);
    for (const key of Object.keys(ERROR_MESSAGES)) {
      if (msg.includes(key)) return state.language === "zh" ? ERROR_MESSAGES_ZH[key] : ERROR_MESSAGES[key];
    }
    return state.language === "zh" ? "出了点问题，请重试。" : "Something went wrong. Please try again.";
  }
  function eventPublishError(err) {
    const msg = err?.message || String(err);
    // This is the most common cause when an Events feature is added to an
    // already-configured project: the frontend is updated before its one-time
    // database migration. Keep the message useful without exposing raw SQL.
    if (/events|event_participants|create_event|permission denied/i.test(msg)) {
      return state.language === "zh" ? "发布活动前需要先更新数据库。请在 Supabase 运行活动迁移后重试。" : "Events needs a quick database update before publishing. Run the Events migration in Supabase, then try again.";
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
    const copied = () => toast(doneMsg || t("copiedToast"));
    const fallbackCopy = () => {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(input);
      input.select();
      const success = document.execCommand("copy");
      input.remove();
      if (success) copied(); else toast(t("copyFailedToast"));
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(copied, fallbackCopy);
    else fallbackCopy();
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
  function copyEventLink(eventId) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("event", eventId);
    copyText(url.toString(), t("eventLinkCopiedToast"));
  }
  function eventShareMatches() {
    return myMatches().map((match) => ({ match, profile: matchPartner(match) }))
      .filter(({ profile }) => profile && !profile.is_system_account);
  }
  function renderEventShareModal() {
    const event = state.events.find((item) => item.id === state.eventShareId);
    if (!event) return closeEventShare();
    $("event-share-preview").innerHTML = `<strong>${esc(event.title)}</strong><span>${esc(fmtEventTime(event.starts_at))} · ${esc(onlineEventUrl(event) ? t("onlineEvent") : event.location)}</span>`;
    const choices = eventShareMatches();
    $("event-share-list").innerHTML = choices.length
      ? `<div class="section-label">${esc(t("chooseConversation"))}</div>${choices.map(({ match, profile }) => `<button class="event-share-recipient ${state.eventShareMatchId === match.id ? "selected" : ""}" data-event-share-match="${esc(match.id)}">${avatarHtml(profile, "sm")}<span class="recipient-name">${esc(profile.name)}</span></button>`).join("")}`
      : `<p class="event-share-empty">${esc(t("noMatchesToShare"))}</p>`;
    $("btn-send-event-invite").disabled = !state.eventShareMatchId;
    $("event-share-list").querySelectorAll("[data-event-share-match]").forEach((button) => button.addEventListener("click", () => {
      state.eventShareMatchId = button.dataset.eventShareMatch;
      renderEventShareModal();
    }));
  }
  function openEventShare(eventId) {
    if (!state.me) { showProfileGate(); return; }
    state.eventShareId = eventId;
    state.eventShareMatchId = null;
    renderEventShareModal();
    $("event-share-modal").classList.add("visible");
    $("event-share-modal").setAttribute("aria-hidden", "false");
  }
  function closeEventShare() {
    state.eventShareId = null;
    state.eventShareMatchId = null;
    $("event-share-modal").classList.remove("visible");
    $("event-share-modal").setAttribute("aria-hidden", "true");
  }
  async function sendEventInviteClick() {
    if (!state.eventShareId || !state.eventShareMatchId) return;
    const button = $("btn-send-event-invite");
    button.disabled = true;
    try {
      const message = await api.sendEventInvite(state.code, state.eventShareMatchId, state.eventShareId);
      state.messages.push(message);
      closeEventShare();
      toast(t("eventInviteSent"));
    } catch (error) {
      button.disabled = false;
      toast(friendlyError(error));
    }
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
        p_company_visible: f.company_visible, p_avatar_color: f.avatar_color, p_avatar_image: f.avatar_image, p_gender: f.gender, p_personality_tags: f.personality_tags, p_custom_tag: f.custom_tag,
      }),
      login: (code) => rpc("login", { p_code: code }),
      updateProfile: (code, f) => rpc("update_profile", {
        p_code: code, p_name: f.name, p_title: f.title, p_company: f.company,
        p_industry: f.industry, p_years_exp: f.years_exp,
        p_background: f.background, p_looking_for: f.looking_for, p_company_visible: f.company_visible, p_avatar_color: f.avatar_color, p_avatar_image: f.avatar_image, p_gender: f.gender, p_personality_tags: f.personality_tags, p_custom_tag: f.custom_tag,
      }),
      sendRequest: (code, toId, kind, message) => rpc("send_request", { p_code: code, p_to_id: toId, p_kind: kind, p_message: message }),
      respondRequest: (code, reqId, accept) => rpc("respond_request", { p_code: code, p_request_id: reqId, p_accept: accept }),
      sendMessage: (code, matchId, body) => rpc("send_message", { p_code: code, p_match_id: matchId, p_body: body }),
      sendEventInvite: (code, matchId, eventId) => rpc("send_event_invite", { p_code: code, p_match_id: matchId, p_event_id: eventId }),
      createEvent: (code, event) => rpc("create_event", { p_code: code, p_title: event.title, p_description: event.description, p_starts_at: event.starts_at, p_location: event.location, p_online_url: event.online_url, p_visibility: event.visibility, p_industries: event.industries, p_max_participants: event.max_participants }),
      updateEvent: (code, eventId, event) => rpc("update_event", { p_code: code, p_event_id: eventId, p_title: event.title, p_description: event.description, p_starts_at: event.starts_at, p_location: event.location, p_online_url: event.online_url, p_visibility: event.visibility, p_industries: event.industries, p_max_participants: event.max_participants }),
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
        const sharedEventId = new URLSearchParams(window.location.search).get("event");
        let visibleEvents;
        try {
          visibleEvents = await rpc("fetch_visible_events", { p_code: state.code || null, p_shared_event_id: sharedEventId || null });
        } catch (error) {
          visibleEvents = { error };
        }
        const eventsAvailable = !visibleEvents.error;
        let invitedEvents = { events: [], participants: [] };
        if (eventsAvailable && state.code) {
          try { invitedEvents = await rpc("fetch_invited_events", { p_code: state.code }); } catch (_) { invitedEvents = { events: [], participants: [] }; }
        }
        const myMatches = matches.data.filter((m) => m.user_a === myId || m.user_b === myId);
        let messages = [];
        if (myMatches.length) {
          const res = await sb.from("messages").select("*")
            .in("match_id", myMatches.map((m) => m.id))
            .order("created_at", { ascending: true });
          if (res.error) throw res.error;
          messages = res.data;
        }
        const allEvents = [...(visibleEvents.events || []), ...(invitedEvents.events || [])].filter((event, index, list) => list.findIndex((item) => item.id === event.id) === index);
        const allParticipants = [...(visibleEvents.participants || []), ...(invitedEvents.participants || [])].filter((row, index, list) => list.findIndex((item) => item.event_id === row.event_id && item.profile_id === row.profile_id) === index);
        return { profiles: profiles.data, requests: requests.data, matches: matches.data, messages,
          events: eventsAvailable ? allEvents : [], participants: eventsAvailable ? allParticipants : [], eventsAvailable };
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
      d.msgSeq ||= 1;
      if (ensureDemoBot(d)) save(d);
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

    function ensureDemoBot(d) {
      let changed = false;
      let bot = d.profiles.find((profile) => profile.is_system_account);
      if (!bot) {
        bot = {
          id: uuid(), name: "Yolink Bot", title: "Yolink 官方助手", company: "Yolink", company_visible: true,
          industry: "General", years_exp: 0, background: "我是 Yolink 的官方助手，帮助你了解社区、活动和连接功能。",
          looking_for: "随时欢迎你来聊聊。", avatar_color: "#e6b84d", gender: "prefer_not_to_say",
          is_system_account: true, created_at: new Date().toISOString()
        };
        d.profiles.unshift(bot);
        changed = true;
      }
      d.profiles.filter((profile) => profile.id !== bot.id && !profile.is_system_account).forEach((profile) => {
        const matchId = makeMatch(d, profile.id, bot.id, "staff");
        if (!d.messages.some((message) => message.match_id === matchId && message.sender_id === bot.id && message.body === "欢迎来到 Yolink！需要帮助可以随时问我。")) {
          d.messages.push({ id: d.msgSeq++, match_id: matchId, sender_id: bot.id, body: "欢迎来到 Yolink！需要帮助可以随时问我。", created_at: new Date().toISOString() });
          changed = true;
        }
      });
      return changed;
    }

    const delay = (v) => new Promise((res) => setTimeout(() => res(v), 120));

    return {
      demo: true,
      async createProfile(f) {
        const d = db();
        const profile = { id: uuid(), name: f.name, title: f.title, company: f.company || null, company_visible: f.company_visible,
          industry: f.industry, years_exp: f.years_exp, background: f.background, gender: f.gender,
          looking_for: f.looking_for, personality_tags: f.personality_tags || "", custom_tag: f.custom_tag || null, avatar_color: f.avatar_color, avatar_image: f.avatar_image || null, created_at: new Date().toISOString() };
        d.profiles.unshift(profile);
        const code = genCode();
        d.secrets[code] = profile.id;
        ensureDemoBot(d);
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
        Object.assign(p, { name: f.name, title: f.title, company: f.company || null, company_visible: f.company_visible,
          industry: f.industry, years_exp: f.years_exp, background: f.background, looking_for: f.looking_for, personality_tags: f.personality_tags || "", custom_tag: f.custom_tag || null, avatar_color: f.avatar_color, avatar_image: f.avatar_image || null, gender: f.gender });
        save(d);
        return delay(p);
      },
      async sendRequest(code, toId, kind, message) {
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
        d.requests.push({ id: uuid(), from_id: from, to_id: toId, kind, message: String(message || "").trim() || null, status: "pending", created_at: new Date().toISOString() });
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
      async sendEventInvite(code, matchId, eventId) {
        const d = db();
        const me = auth(d, code);
        const match = d.matches.find((item) => item.id === matchId);
        const event = d.events.find((item) => item.id === eventId);
        if (!match || (match.user_a !== me && match.user_b !== me)) throw new Error("NOT_YOUR_MATCH");
        if (!event) throw new Error("EVENT_NOT_FOUND");
        const msg = { id: d.msgSeq++, match_id: matchId, sender_id: me, body: "", event_id: eventId, created_at: new Date().toISOString() };
        d.messages.push(msg);
        save(d);
        return delay(msg);
      },
      async createEvent(code, event) {
        const d = db();
        const creatorId = auth(d, code);
        const row = { id: uuid(), creator_id: creatorId, title: event.title.trim(), description: event.description.trim() || null, starts_at: event.starts_at, location: event.location.trim(), online_url: event.online_url || null, visibility: event.visibility || "public", industries: event.industries || "", max_participants: event.max_participants, created_at: new Date().toISOString() };
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
        if (new Date(event.starts_at) <= new Date()) throw new Error("EVENT_ENDED");
        if (["connection_required", "connections_only"].includes(event.visibility) && event.creator_id !== profileId && !d.matches.some((match) => (match.user_a === profileId && match.user_b === event.creator_id) || (match.user_b === profileId && match.user_a === event.creator_id))) throw new Error("EVENT_CONNECTION_REQUIRED");
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
        d.events[index] = { ...d.events[index], title: event.title.trim(), description: event.description.trim() || null, starts_at: event.starts_at, location: event.location.trim(), online_url: event.online_url || null, visibility: event.visibility || "public", industries: event.industries, max_participants: event.max_participants };
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
        const sharedEventId = new URLSearchParams(window.location.search).get("event");
        const connectedWithHost = (event) => !!myId && (event.creator_id === myId || d.matches.some((match) => (match.user_a === myId && match.user_b === event.creator_id) || (match.user_b === myId && match.user_a === event.creator_id)));
        const visibleEvents = d.events.filter((event) => {
          const visibility = event.visibility || "public";
          if (visibility === "connections_only") return connectedWithHost(event);
          if (visibility === "unlisted") return event.id === sharedEventId || event.creator_id === myId || d.participants.some((row) => row.event_id === event.id && row.profile_id === myId);
          return true;
        });
        return delay({
          profiles: [...d.profiles],
          requests: [...d.requests],
          matches: [...d.matches],
          messages: d.messages.filter((m) => myMatchIds.has(m.match_id)),
          events: visibleEvents,
          participants: d.participants.filter((row) => visibleEvents.some((event) => event.id === row.event_id)),
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
    eventDirectDetail: false,
    eventShareId: null,
    eventShareMatchId: null,
    discoverIndustry: "all",
    discoverExperience: "all",
    openDiscoverFilter: null,
    eventPickerOpen: null,
    eventCalendarCursor: new Date(),
    locationSearchTimer: null,
    locationSearchRequest: 0,
    reportProfileId: null,
    requestToId: null,
    requestKind: null,
    profileEditing: false,
    myEventsDate: "all",
    myEventsFilterOpen: false,
    eventIndustry: "all",
    eventTime: "upcoming",
    openEventFilter: null,
    editingEventId: null,
    onboardingAvatarImage: null,
    profileAvatarImage: null,
    profileGenderPickerOpen: null,
    onboardingExperiencePickerOpen: null,
    profileExperiencePickerOpen: null,
    photoCrop: null,
    photoCropDrag: null,
    language: localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "zh",
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
    if (name !== "events") state.eventDirectDetail = false;
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

  function genderIconHtml(gender) {
    const icons = {
      woman: ["♀", "woman"],
      man: ["♂", "man"],
      nonbinary: ["⚧", "nonbinary"],
    };
    const icon = icons[gender];
    return icon ? `<span class="gender-icon ${icon[1]}" title="${esc(genderLabel(gender))}" aria-label="${esc(genderLabel(gender))}">${icon[0]}</span>` : "";
  }

  function profileCardHtml(p, actionsHtml, bannerHtml) {
    const company = p.company && p.company_visible !== false ? ` <span style="opacity:.75">@ ${esc(p.company)}</span>` : "";
    const genderIcon = genderIconHtml(p.gender);
    const industries = parsedIndustries(p.industry);
    const personalityTags = parsedPersonalityTags(p.personality_tags);
    return `
      <div class="card">
        ${bannerHtml || ""}
        <div class="pcard-head" style="background:linear-gradient(135deg, ${esc(p.avatar_color)}, ${esc(p.avatar_color)}cc)">
          ${avatarHtml(p, "lg")}
          <div style="min-width:0">
            <h2 class="pcard-name">${esc(p.name)}${p.is_system_account ? ` <span class="official-badge">${esc(t("officialAccount"))}</span>` : ""}</h2>
            <p class="pcard-title">${esc(p.title)}${company}${genderIcon}</p>
          </div>
        </div>
        <div class="pcard-body">
          <div class="chips">
            ${industries.map((industry) => `<span class="chip">${esc(industryLabel(industry))}</span>`).join("")}
            <span class="chip">${esc(experienceLabel(p.years_exp))}</span>
          </div>
          ${personalityTags.length || p.custom_tag ? `<div class="personality-tags">${personalityTags.map((tag) => `<span class="personality-tag">${esc(personalityTagLabel(tag))}</span>`).join("")}${p.custom_tag ? `<span class="personality-tag">${esc(p.custom_tag)}</span>` : ""}</div>` : ""}
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
      state.me ? state.requests.filter((r) => r.from_id === state.me.id).map((r) => [r.to_id, r]) : []
    );

    const allIndustries = uniqueIndustries(state.profiles.flatMap((p) => parsedIndustries(p.industry))).sort((a, b) => industryLabel(a).localeCompare(industryLabel(b)));
    const experienceOptions = [["all", "All experience"], ["0-2", "0–2 years"], ["3-5", "3–5 years"], ["6-10", "6–10 years"], ["11+", "10+ years"]];
    const filterHtml = (type, label, selected, options) => {
      const selectedLabel = options.find(([value]) => value === selected)?.[1] || options[0][1];
      return `<div class="discover-filter"><label>${esc(label)}</label><button class="discover-filter-trigger" data-filter-toggle="${type}" aria-expanded="${state.openDiscoverFilter === type}"><span>${esc(selectedLabel)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>${state.openDiscoverFilter === type ? `<div class="discover-filter-menu">${options.map(([value, text]) => `<button data-filter-option="${type}" data-filter-value="${esc(value)}" class="${value === selected ? "selected" : ""}">${esc(text)}</button>`).join("")}</div>` : ""}</div>`;
    };
    $("discover-filters").innerHTML = `<div class="discover-filter-bar">${filterHtml("industry", "Industry", state.discoverIndustry, [["all", "All industries"], ...allIndustries.map((industry) => [industry, industryLabel(industry)])])}${filterHtml("experience", "Experience", state.discoverExperience, experienceOptions)}</div>`;
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
      const industries = parsedIndustries(p.industry);
      return !p.is_system_account && (!state.me || p.id !== state.me.id) && !matchedIds.has(p.id) &&
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
        const label = existing.status === "passed" ? "They passed for now" : t("requestSent");
        actions = `<div class="pcard-actions"><button class="btn requested full" disabled>${label}</button></div>`;
      } else {
        actions = `
          <div class="pcard-actions">
            <button class="btn" data-request="network" data-to="${esc(p.id)}">${t("letsNetwork")}</button>
            <button class="report-btn" data-report="${esc(p.id)}" data-report-name="${esc(p.name)}">${t("report")}</button>
          </div>`;
      }
      return profileCardHtml(p, actions);
    }).join("");

    $("discover-list").querySelectorAll("[data-request]").forEach((btn) => {
      btn.addEventListener("click", () => openRequestComposer(btn.dataset.to, btn.dataset.request));
    });
  }

  // ---------- Discover pull-to-refresh ----------
  let discoverPullStartY = null;
  let discoverPullDistance = 0;
  let discoverRefreshing = false;
  const DISCOVER_PULL_THRESHOLD = 72;

  function renderDiscoverPullRefresh({ distance = 0, refreshing = false } = {}) {
    const indicator = $("discover-pull-refresh");
    const label = indicator.querySelector(".pull-refresh-label");
    const active = refreshing || distance > 0;
    indicator.classList.toggle("visible", active);
    indicator.classList.toggle("ready", !refreshing && distance >= DISCOVER_PULL_THRESHOLD);
    indicator.classList.toggle("refreshing", refreshing);
    indicator.setAttribute("aria-hidden", String(!active));
    label.textContent = refreshing ? t("refreshing") : distance >= DISCOVER_PULL_THRESHOLD ? t("releaseToRefresh") : t("pullToRefresh");
  }

  async function refreshDiscoverFromPull() {
    if (discoverRefreshing) return;
    discoverRefreshing = true;
    const refreshButton = $("btn-refresh-discover");
    refreshButton.disabled = true;
    refreshButton.classList.add("refreshing");
    renderDiscoverPullRefresh({ refreshing: true });
    try {
      state.openDiscoverFilter = null;
      await refreshAll({ silent: true });
      if (state.currentScreen === "discover") renderDiscover();
      toast(t("discoverRefreshedToast"));
    } catch (err) {
      toast(friendlyError(err));
    } finally {
      discoverRefreshing = false;
      refreshButton.disabled = false;
      refreshButton.classList.remove("refreshing");
      window.setTimeout(() => renderDiscoverPullRefresh(), 260);
    }
  }

  // ---------- Events pull-to-refresh ----------
  let eventsPullStartY = null;
  let eventsPullDistance = 0;
  let eventsRefreshing = false;

  function renderEventsPullRefresh({ distance = 0, refreshing = false } = {}) {
    const indicator = $("events-pull-refresh");
    const label = indicator.querySelector(".pull-refresh-label");
    const active = refreshing || distance > 0;
    indicator.classList.toggle("visible", active);
    indicator.classList.toggle("ready", !refreshing && distance >= DISCOVER_PULL_THRESHOLD);
    indicator.classList.toggle("refreshing", refreshing);
    indicator.setAttribute("aria-hidden", String(!active));
    label.textContent = refreshing ? t("refreshing") : distance >= DISCOVER_PULL_THRESHOLD ? t("releaseToRefresh") : t("pullToRefresh");
  }

  async function refreshEventsFromPull() {
    if (eventsRefreshing) return;
    eventsRefreshing = true;
    renderEventsPullRefresh({ refreshing: true });
    try {
      await refreshAll({ silent: true });
      if (state.currentScreen === "events") renderEvents();
      toast(t("eventsRefreshedToast"));
    } catch (err) {
      toast(friendlyError(err));
    } finally {
      eventsRefreshing = false;
      window.setTimeout(() => renderEventsPullRefresh(), 260);
    }
  }

  function reportProfile(profileId, profileName = "") {
    if (!state.me) { showProfileGate(); return; }
    const profile = profileById(profileId);
    const name = profile?.name || profileName;
    if (!profileId || !name) {
      toast(state.language === "zh" ? "暂时无法打开举报窗口，请重试。" : "Unable to open the report form. Please try again.");
      return;
    }
    state.reportProfileId = profileId;
    $("report-profile-name").textContent = name;
    $("report-help").innerHTML = state.language === "zh"
      ? `请向 Yolink 团队说明与 <strong>${esc(name)}</strong> 有关的问题。举报内容仅对工作人员可见。`
      : `Tell the Yolink team what happened with <strong>${esc(name)}</strong>. Your report is only visible to staff.`;
    $("report-reason").value = "";
    $("report-error").classList.remove("visible");
    $("report-modal").classList.add("visible");
    $("report-modal").setAttribute("aria-hidden", "false");
    $("report-reason").focus();
  }
  function closeReportModal() {
    state.reportProfileId = null;
    $("report-reason").value = "";
    $("report-error").textContent = "";
    $("report-error").classList.remove("visible");
    $("btn-submit-report").disabled = false;
    $("report-modal").classList.remove("visible");
    $("report-modal").setAttribute("aria-hidden", "true");
  }
  async function submitReport() {
    const reason = $("report-reason").value.trim();
    const error = $("report-error");
    if (!reason) { error.textContent = t("reportReasonRequired"); error.classList.add("visible"); return; }
    const button = $("btn-submit-report");
    button.disabled = true; error.classList.remove("visible");
    try {
      await api.reportProfile(state.code, state.reportProfileId, reason);
      closeReportModal();
      toast(t("reportSentToast"));
    } catch (err) {
      if ((err?.message || String(err)).includes("ALREADY_REPORTED")) {
        closeReportModal();
        toast(t("alreadyReportedToast"));
        return;
      }
      error.textContent = friendlyError(err);
      error.classList.add("visible");
    } finally { button.disabled = false; }
  }

  function openRequestComposer(toId, kind) {
    if (!state.me) { showProfileGate(); return; }
    state.requestToId = toId;
    state.requestKind = kind;
    $("request-message").value = "";
    $("request-message-error").classList.remove("visible");
    $("request-modal").classList.add("visible");
    $("request-modal").setAttribute("aria-hidden", "false");
    $("request-message").focus();
  }
  function closeRequestComposer() {
    state.requestToId = null;
    state.requestKind = null;
    $("request-modal").classList.remove("visible");
    $("request-modal").setAttribute("aria-hidden", "true");
  }
  async function sendRequestClick() {
    const toId = state.requestToId;
    const kind = state.requestKind;
    if (!toId || !kind) return;
    const btn = $("btn-submit-request");
    const message = $("request-message").value.trim();
    btn.disabled = true;
    try {
      const result = await api.sendRequest(state.code, toId, kind, message);
      closeRequestComposer();
      if (result.matched) {
        await refreshAll({ silent: true });
        showMatchOverlay(result.match_id);
      } else {
        toast(kind === "coffee" ? t("coffeeRequestedToast") : t("requestSentToast"));
        await refreshAll({ silent: true });
      }
      if (state.currentScreen === "discover") renderDiscover();
    } catch (err) {
      $("request-message-error").textContent = friendlyError(err);
      $("request-message-error").classList.add("visible");
    } finally { btn.disabled = false; }
  }

  // ---------- Events ----------
  const EVENT_VISIBILITY_OPTIONS = ["public", "connection_required", "connections_only", "unlisted"];
  function eventVisibility(event) { return EVENT_VISIBILITY_OPTIONS.includes(event.visibility) ? event.visibility : "public"; }
  function eventVisibilityLabel(value) {
    return t({ public: "visibilityPublic", connection_required: "visibilityConnectToJoin", connections_only: "visibilityConnectionsOnly", unlisted: "visibilityUnlisted" }[value] || "visibilityPublic");
  }
  function eventVisibilityHelp(value) {
    return t({ public: "visibilityPublicHelp", connection_required: "visibilityConnectToJoinHelp", connections_only: "visibilityConnectionsOnlyHelp", unlisted: "visibilityUnlistedHelp" }[value] || "visibilityPublicHelp");
  }
  function connectedWithHost(event) {
    if (!state.me || event.creator_id === state.me.id) return true;
    return state.matches.some((match) => (match.user_a === state.me.id && match.user_b === event.creator_id) || (match.user_b === state.me.id && match.user_a === event.creator_id));
  }
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
    const visibility = eventVisibility({ visibility: $("event-visibility").value });
    $("event-visibility").value = visibility;
    $("event-visibility-trigger").textContent = eventVisibilityLabel(visibility);
    $("event-visibility-help").textContent = eventVisibilityHelp(visibility);
    const visibilityMenu = $("event-visibility-menu");
    visibilityMenu.hidden = state.eventPickerOpen !== "visibility";
    visibilityMenu.innerHTML = state.eventPickerOpen === "visibility"
      ? EVENT_VISIBILITY_OPTIONS.map((value) => `<button data-event-visibility="${value}" class="${value === visibility ? "selected" : ""}">${esc(eventVisibilityLabel(value))}</button>`).join("")
      : "";
    [1, 2].forEach((number) => {
      const value = $("event-industry-" + number).value;
      const type = "industry-" + number;
      const trigger = $("event-industry-" + number + "-trigger");
      const menu = $("event-industry-" + number + "-menu");
      const choices = availableIndustryOptions(value, [1, 2].filter((item) => item !== number).map((item) => $("event-industry-" + item).value));
      trigger.textContent = value ? industryLabel(value) : t(number === 1 ? "chooseIndustry" : "addIndustry");
      menu.hidden = state.eventPickerOpen !== type;
      menu.innerHTML = state.eventPickerOpen === type
        ? choices.map((industry) => `<button data-event-industry="${number}" data-industry-value="${esc(industry)}" class="${industry === normalizeIndustry(value) ? "selected" : ""}">${esc(industryLabel(industry))}</button>`).join("") + (number === 2 && value ? `<button class="clear-industry" data-event-industry="${number}" data-industry-value="">${esc(t("clearIndustry"))}</button>` : "")
        : "";
    });
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
  function eventIndustries(event) { return parsedIndustries(event.industries); }
  function onlineEventUrl(event) {
    try {
      const url = new URL(event.online_url || "");
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }
  function eventCardHtml(event, expanded, membership) {
    const count = participantsFor(event.id).length;
    const role = membership ? `<div class="event-membership ${membership === "Hosting" ? "hosting" : ""}">${esc(membership)}</div>` : "";
    const industries = eventIndustries(event);
    const visibility = eventVisibility(event);
    const tags = industries.length || visibility !== "public" ? `<div class="event-industries">${industries.map((industry) => `<span>${esc(industryLabel(industry))}</span>`).join("")}${visibility !== "public" ? `<span class="event-visibility-tag">${esc(eventVisibilityLabel(visibility))}</span>` : ""}</div>` : "";
    const onlineUrl = onlineEventUrl(event);
    const venue = onlineUrl ? `💻 ${esc(t("onlineEvent"))}` : `📍 ${esc(event.location)}`;
    return `<div class="card event-card" data-open-event="${esc(event.id)}"><div class="event-top">${eventDateHtml(event.starts_at)}<div class="event-meta"><h2>${esc(event.title)}</h2><div class="when">${esc(fmtEventTime(event.starts_at))}</div><div class="where">${venue}</div>${tags}<div class="going">${count} / ${esc(String(event.max_participants || 20))} going</div>${role}</div></div>${expanded || ""}</div>`;
  }
  function eventProfileTagHtml(profile, removableEventId) {
    const remove = removableEventId ? `<button class="remove-participant" data-remove-participant="${esc(profile.id)}" data-remove-from-event="${esc(removableEventId)}" aria-label="Remove ${esc(profile.name)} from event">×</button>` : "";
    return `<div class="participant-control"><button class="participant" data-view-profile="${esc(profile.id)}">${avatarHtml(profile, "sm")}<span>${esc(profile.name)}</span></button>${remove}</div>`;
  }
  function eventDetailHtml(detail, hostControls = false) {
    const people = participantsFor(detail.id).map((row) => profileById(row.profile_id)).filter(Boolean);
    const creator = profileById(detail.creator_id);
    const myId = state.me?.id;
    const joined = !!myId && people.some((person) => person.id === myId);
    const isFull = people.length >= (detail.max_participants || 20);
    const upcoming = new Date(detail.starts_at) > new Date();
    const needsConnection = ["connection_required", "connections_only"].includes(eventVisibility(detail)) && !connectedWithHost(detail);
    const attendeeTags = people.map((person) => eventProfileTagHtml(person, hostControls && person.id !== detail.creator_id ? detail.id : null)).join("");
    const hostActions = hostControls ? `<button class="btn full secondary event-edit-btn" data-edit-event="${esc(detail.id)}">${esc(t("editEvent"))}</button>${upcoming ? `<button class="btn full danger-ghost event-cancel-btn" data-cancel-event="${esc(detail.id)}">${esc(t("cancelEvent"))}</button>` : ""}` : "";
    const attendanceAction = joined && detail.creator_id !== myId
      ? `<button class="btn full secondary" data-leave-event="${esc(detail.id)}">${esc(t("quitEvent"))}</button>`
      : `<button class="btn full ${joined ? "requested" : ""}" data-join-event="${esc(detail.id)}" ${joined || isFull || !upcoming || needsConnection ? "disabled" : ""}>${joined ? "You're going ✓" : !upcoming ? t("eventEnded") : isFull ? t("eventFull") : needsConnection ? t("connectToJoin") : t("joinEvent")}</button>`;
    const onlineUrl = onlineEventUrl(detail);
    const onlineLink = onlineUrl ? `<a class="btn full secondary event-online-link" href="${esc(onlineUrl)}" target="_blank" rel="noopener noreferrer">${esc(t("joinOnlineEvent"))}</a>` : "";
    return `<div class="event-expanded"><button class="btn ghost event-back" data-close-event>← Close details</button>${detail.description ? `<div class="event-description">${esc(detail.description)}</div>` : ""}${onlineLink}${creator ? `<div class="section-label">Event host</div><div class="participant-list">${eventProfileTagHtml(creator)}</div>` : ""}<div class="section-label">Participants · ${people.length} of ${esc(String(detail.max_participants || 20))}</div><div class="participant-list">${attendeeTags || "<span class=\"hint\">No participants yet.</span>"}</div>${hostActions}${attendanceAction}<button class="btn full ghost event-share-btn" data-share-event="${esc(detail.id)}">${esc(t("shareEvent"))}</button></div>`;
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
    const detail = state.events.find((event) => event.id === state.openEventId);
    if (state.eventDirectDetail && detail) {
      form.hidden = true;
      $("btn-show-event-form").hidden = true;
      $("event-filters").innerHTML = "";
      $("events-list").innerHTML = "";
      $("event-detail").innerHTML = `<div class="event-direct-detail">${eventCardHtml(detail, eventDetailHtml(detail))}</div>`;
      const root = $("event-detail");
      root.querySelector("[data-close-event]")?.addEventListener("click", () => { state.eventDirectDetail = false; state.openEventId = null; renderEvents(); });
      root.querySelector("[data-join-event]")?.addEventListener("click", (event) => joinEventClick(event.currentTarget.dataset.joinEvent, event.currentTarget));
      root.querySelector("[data-leave-event]")?.addEventListener("click", (event) => leaveEventClick(event.currentTarget.dataset.leaveEvent, event.currentTarget, renderEvents));
      root.querySelector("[data-share-event]")?.addEventListener("click", (event) => openEventShare(event.currentTarget.dataset.shareEvent));
      root.querySelectorAll("[data-view-profile]").forEach((tag) => tag.addEventListener("click", () => showMemberProfile(tag.dataset.viewProfile)));
      return;
    }
    const allIndustries = uniqueIndustries(state.events.flatMap(eventIndustries)).sort((a, b) => industryLabel(a).localeCompare(industryLabel(b)));
    const filterHtml = (type, label, selected, options) => {
      const selectedLabel = options.find(([value]) => value === selected)?.[1] || options[0][1];
      return `<div class="discover-filter event-filter"><label>${esc(label)}</label><button class="discover-filter-trigger" data-event-filter-toggle="${type}" aria-expanded="${state.openEventFilter === type}"><span>${esc(selectedLabel)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>${state.openEventFilter === type ? `<div class="discover-filter-menu">${options.map(([value, text]) => `<button data-event-filter-option="${type}" data-event-filter-value="${esc(value)}" class="${value === selected ? "selected" : ""}">${esc(text)}</button>`).join("")}</div>` : ""}</div>`;
    };
    const timeOptions = [["upcoming", "Upcoming"], ["today", "Today"], ["week", "This week"], ["past", "Past"], ["all", "All time"]];
    $("event-filters").innerHTML = `<div class="discover-filter-bar event-filter-bar">${filterHtml("industry", "Industry", state.eventIndustry, [["all", "All industries"], ...allIndustries.map((industry) => [industry, industryLabel(industry)])])}${filterHtml("time", "Time", state.eventTime, timeOptions)}</div>`;
    $("event-filters").querySelectorAll("[data-event-filter-toggle]").forEach((button) => button.addEventListener("click", () => { state.openEventFilter = state.openEventFilter === button.dataset.eventFilterToggle ? null : button.dataset.eventFilterToggle; renderEvents(); }));
    $("event-filters").querySelectorAll("[data-event-filter-option]").forEach((button) => button.addEventListener("click", () => { if (button.dataset.eventFilterOption === "industry") state.eventIndustry = button.dataset.eventFilterValue; else state.eventTime = button.dataset.eventFilterValue; state.openEventFilter = null; renderEvents(); }));
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
      if (ev.target.closest("[data-close-event], [data-join-event], [data-leave-event], [data-cancel-event], [data-share-event], [data-view-profile], [data-edit-event], [data-remove-participant], .event-online-link")) return;
      state.eventDirectDetail = false; state.openEventId = card.dataset.openEvent; renderEvents();
    }));
    $("events-list").querySelector("[data-close-event]")?.addEventListener("click", () => { state.openEventId = null; renderEvents(); });
    $("events-list").querySelector("[data-join-event]")?.addEventListener("click", (ev) => joinEventClick(ev.currentTarget.dataset.joinEvent, ev.currentTarget));
    $("events-list").querySelector("[data-leave-event]")?.addEventListener("click", (ev) => leaveEventClick(ev.currentTarget.dataset.leaveEvent, ev.currentTarget, renderEvents));
    $("events-list").querySelector("[data-share-event]")?.addEventListener("click", (ev) => openEventShare(ev.currentTarget.dataset.shareEvent));
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
      if (ev.target.closest("[data-close-event], [data-join-event], [data-leave-event], [data-cancel-event], [data-share-event], [data-view-profile], [data-edit-event], [data-remove-participant], .event-online-link")) return;
      state.openEventId = eventCard.dataset.openEvent; renderMyEvents();
    }));
    $("my-events-list").querySelector("[data-close-event]")?.addEventListener("click", () => { state.openEventId = null; renderMyEvents(); });
    $("my-events-list").querySelector("[data-leave-event]")?.addEventListener("click", (ev) => leaveEventClick(ev.currentTarget.dataset.leaveEvent, ev.currentTarget, renderMyEvents));
    $("my-events-list").querySelector("[data-share-event]")?.addEventListener("click", (ev) => openEventShare(ev.currentTarget.dataset.shareEvent));
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
    if (!state.me) { showProfileGate(); return; }
    showScreen("events");
    state.editingEventId = null;
    ["event-title", "event-date", "event-time", "event-location", "event-online-url", "event-industry-1", "event-industry-2", "event-description"].forEach((id) => { $(id).value = ""; });
    $("event-visibility").value = "public";
    $("event-online").checked = false;
    $("event-max-participants").value = 20;
    $("event-error").textContent = "";
    hideLocationSuggestions();
    $("event-error").classList.remove("visible");
    $("event-create-panel").querySelector(".section-label").textContent = t("newEvent");
    $("btn-create-event").textContent = t("publishEvent");
    $("event-create-panel").dataset.open = "true";
    state.eventPickerOpen = null;
    syncEventOnlineFields();
    renderEventPickers();
    renderEvents();
    $("event-title").focus();
  }
  function syncEventOnlineFields() {
    const online = $("event-online").checked;
    $("event-online-url-field").hidden = !online;
    $("event-online-url").required = online;
    $("event-location-required").hidden = online;
    if (online) hideLocationSuggestions();
  }
  function hideLocationSuggestions() {
    const results = $("event-location-results");
    results.hidden = true;
    results.innerHTML = "";
  }
  function renderLocationSuggestions(places, empty = false) {
    const results = $("event-location-results");
    if (!places.length && !empty) return hideLocationSuggestions();
    results.hidden = false;
    results.innerHTML = places.length
      ? places.map((place, index) => `<button type="button" class="event-location-option" data-location-option="${index}"><strong>${esc(place.name)}</strong><span>${esc(place.address || place.city || "")}</span></button>`).join("")
      : `<div class="event-location-option"><span>${esc(t("locationNoResults"))}</span></div>`;
    results.querySelectorAll("[data-location-option]").forEach((button) => button.addEventListener("click", () => {
      const place = places[Number(button.dataset.locationOption)];
      if (!place) return;
      const detail = [place.address, place.city].filter((value, index, list) => value && list.indexOf(value) === index).join(" · ");
      $("event-location").value = detail ? `${place.name} · ${detail}` : place.name;
      hideLocationSuggestions();
    }));
  }
  function searchEventLocation() {
    if ($("event-online").checked) return;
    const query = $("event-location").value.trim();
    clearTimeout(state.locationSearchTimer);
    if (query.length < 2) return hideLocationSuggestions();
    const request = ++state.locationSearchRequest;
    state.locationSearchTimer = setTimeout(async () => {
      const results = $("event-location-results");
      results.hidden = false;
      results.innerHTML = `<div class="event-location-option"><span>${esc(t("locationSearching"))}</span></div>`;
      try {
        const response = await fetch(`/api/amap-place-search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("PLACE_SEARCH_UNAVAILABLE");
        const data = await response.json();
        if (request !== state.locationSearchRequest) return;
        renderLocationSuggestions(Array.isArray(data.places) ? data.places : [], true);
      } catch (_) {
        if (request === state.locationSearchRequest) hideLocationSuggestions();
      }
    }, 280);
  }
  function validOnlineUrl(value) {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
    catch { return ""; }
  }
  function cancelEventForm() {
    state.editingEventId = null;
    state.eventPickerOpen = null;
    $("event-error").textContent = "";
    $("event-error").classList.remove("visible");
    delete $("event-create-panel").dataset.open;
    renderEvents();
  }
  async function createEventClick() {
    if (!state.me) { showProfileGate(); return; }
    const error = $("event-error");
    const title = $("event-title").value.trim();
    const date = $("event-date").value;
    const time = $("event-time").value;
    const location = $("event-location").value.trim();
    const onlineUrl = $("event-online").checked ? validOnlineUrl($("event-online-url").value.trim()) : "";
    const description = $("event-description").value.trim();
    const industries = uniqueIndustries([1, 2].map((number) => $("event-industry-" + number).value));
    const maxParticipants = parseInt($("event-max-participants").value, 10);
    if ($("event-online").checked && !onlineUrl) { error.textContent = t("onlineEventUrlRequired"); error.classList.add("visible"); return; }
    if (!title || !date || !time || (!location && !onlineUrl)) { error.textContent = t("eventRequiredDetails"); error.classList.add("visible"); return; }
    if (!industries.length) { error.textContent = t("eventIndustryRequired"); error.classList.add("visible"); return; }
    if (Number.isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 500) { error.textContent = t("eventCapacityInvalid"); error.classList.add("visible"); return; }
    const button = $("btn-create-event"); button.disabled = true; error.classList.remove("visible");
    try {
      const eventData = { title, description, starts_at: new Date(`${date}T${time}`).toISOString(), location: location || "Online", online_url: onlineUrl || null, visibility: eventVisibility({ visibility: $("event-visibility").value }), industries: industries.join(" | "), max_participants: maxParticipants };
      const editing = state.editingEventId;
      const event = editing ? await api.updateEvent(state.code, editing, eventData) : await api.createEvent(state.code, eventData);
      await refreshAll({ silent: true });
      state.openEventId = event.id;
      ["event-title", "event-date", "event-time", "event-location", "event-online-url", "event-industry-1", "event-industry-2", "event-description"].forEach((id) => { $(id).value = ""; });
      $("event-online").checked = false;
      hideLocationSuggestions();
      $("event-visibility").value = "public";
      $("event-max-participants").value = 20;
      state.eventPickerOpen = null;
      state.editingEventId = null;
      renderEventPickers();
      delete $("event-create-panel").dataset.open;
      if (editing) { showScreen("my-events"); toast(t("eventUpdatedToast")); }
      else { renderEvents(); toast(t("eventPublishedToast")); }
    } catch (err) { console.error("Unable to publish event:", err); error.textContent = eventPublishError(err); error.classList.add("visible"); }
    finally { button.disabled = false; }
  }
  async function joinEventClick(eventId, button) {
    if (!state.me) { showProfileGate(); return; }
    const event = state.events.find((item) => item.id === eventId);
    if (event && new Date(event.starts_at) <= new Date()) { toast(t("eventEnded")); return; }
    button.disabled = true;
    try { await api.joinEvent(state.code, eventId); await refreshAll({ silent: true }); renderEvents(); toast(t("joinedEventToast")); }
    catch (err) { toast(friendlyError(err)); button.disabled = false; }
  }
  async function leaveEventClick(eventId, button, rerender) {
    button.disabled = true;
    try {
      await api.leaveEvent(state.code, eventId);
      state.openEventId = null;
      await refreshAll({ silent: true });
      rerender();
      toast(t("leftEventToast"));
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
    $("event-location").value = onlineEventUrl(event) && event.location === "Online" ? "" : event.location;
    hideLocationSuggestions();
    $("event-online").checked = !!onlineEventUrl(event);
    $("event-online-url").value = onlineEventUrl(event);
    $("event-visibility").value = eventVisibility(event);
    const industries = eventIndustries(event);
    $("event-industry-1").value = industries[0] || "";
    $("event-industry-2").value = industries[1] || "";
    $("event-max-participants").value = event.max_participants || 20;
    $("event-description").value = event.description || "";
    $("event-create-panel").querySelector(".section-label").textContent = t("editEvent");
    $("btn-create-event").textContent = t("saveEvent");
    $("event-create-panel").dataset.open = "true";
    state.eventPickerOpen = null;
    syncEventOnlineFields();
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
      toast(t("participantRemovedToast"));
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
      toast(t("eventCancelledToast"));
    } catch (err) {
      toast(friendlyError(err));
      button.disabled = false;
    }
  }

  // ---------- Requests ----------
  function renderRequests() {
    const incoming = incomingRequests();
    const kindText = (k) => k === "coffee"
      ? (state.language === "zh" ? "想和你喝杯咖啡" : "wants to grab a coffee with you")
      : t("defaultNetworkRequest");

    $("requests-incoming").innerHTML = !incoming.length
      ? emptyStateHtml("💌", "No requests yet", t("noRequestsHelp"))
      : incoming.map((r) => {
          const p = profileById(r.from_id);
          if (!p) return "";
          const bannerText = r.message
            ? `💬 ${esc(r.message)}`
            : `${r.kind === "coffee" ? "☕" : "🤝"} ${esc(p.name.split(" ")[0])} ${kindText(r.kind)}`;
          const banner = `<div class="req-kind-banner ${r.kind === "coffee" ? "coffee" : ""}">${bannerText}</div>`;
          const actions = `
            <div class="pcard-actions">
              <button class="btn" data-respond="accept" data-req="${esc(r.id)}">${t("accept")}</button>
              <button class="btn secondary" data-respond="pass" data-req="${esc(r.id)}">${t("pass")}</button>
            </div>`;
          return profileCardHtml(p, actions, banner);
        }).join("");

    const outgoing = outgoingRequests();
    $("requests-outgoing").innerHTML = !outgoing.length ? "" :
      `<div class="section-label">${esc(t("outgoingRequests"))}</div>` +
      outgoing.map((r) => {
        const p = profileById(r.to_id);
        if (!p) return "";
        return `
          <div class="outgoing-row">
            ${avatarHtml(p, "sm")}
            <div class="meta">
              <div class="name">${esc(p.name)}</div>
              <div class="sub">${r.kind === "coffee" ? "☕ Coffee chat" : t("letsNetwork")} · ${esc(fmtTime(r.created_at))}</div>
            </div>
            <span class="status-pill">${esc(t("requestPending"))}</span>
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
      else toast(t("requestPassedToast"));
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
        t("noMatchesHelp"));
      return;
    }

    $("matches-list").innerHTML = list.map((m) => {
      const p = matchPartner(m);
      if (!p) return "";
      const msgs = messagesFor(m.id);
      const last = msgs.at(-1);
      const unread = unreadCount(m.id);
      const preview = last
        ? `${last.sender_id === state.me.id ? (state.language === "zh" ? "你：" : "You: ") : ""}${esc(last.event_id ? t("eventInvite") : last.body)}`
        : (m.source === "staff" ? t("matchPreviewStaff") : t("matchPreviewMutual"));
      const right = !last
        ? `<span class="new-tag">NEW</span>`
        : unread > 0 ? `<span class="unread-dot" title="${unread} unread"></span>` : "";
      return `
        <div class="match-row" data-open="${esc(m.id)}">
          ${avatarHtml(p, "md")}
          <div class="meta">
            <div class="name">${esc(p.name)}${p.is_system_account ? ` <span class="official-badge">${esc(t("officialAccount"))}</span>` : ""}</div>
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
    $("chat-name").textContent = p.is_system_account ? `${p.name} · ${t("officialAccount")}` : p.name;
    $("chat-sub").textContent = p.title + (p.company && p.company_visible !== false ? " @ " + p.company : "");
    $("btn-chat-report").hidden = !!p.is_system_account;
    showScreen("chat");
    renderChatMessages();
    markRead(matchId);
    updateBadges();
    $("chat-input").focus();
  }

  function eventInviteCardHtml(message, mine) {
    const event = state.events.find((item) => item.id === message.event_id);
    if (!event) return `<div class="bubble ${mine ? "mine" : "theirs"}">${esc(t("eventNoLongerAvailable"))}</div>`;
    const host = profileById(event.creator_id);
    const venue = onlineEventUrl(event) ? t("onlineEvent") : event.location;
    return `<button class="event-invite-card ${mine ? "mine" : "theirs"}" data-open-invited-event="${esc(event.id)}"><span class="event-invite-message">${esc(t("eventInviteMessage"))}</span><span class="event-invite-label">📅 ${esc(t("eventInvite"))}</span><strong>${esc(event.title)}</strong><span>${esc(fmtEventTime(event.starts_at))}</span><span>${esc(venue)}${host ? ` · ${esc(host.name)}` : ""}</span></button>`;
  }
  function renderChatMessages() {
    const m = state.matches.find((x) => x.id === state.openMatchId);
    if (!m) return;
    const p = matchPartner(m);
    const msgs = messagesFor(m.id);
    const matchTitle = state.language === "zh" ? `你已与 ${esc(p.name.split(" ")[0])} 匹配` : `You matched with ${esc(p.name.split(" ")[0])}`;
    const matchSub = m.source === "staff"
      ? (state.language === "zh" ? "由 Yolink 团队为你推荐" : "Hand-picked by the Yolink team")
      : (state.language === "zh" ? "你们都想建立连接" : "You both wanted to connect");
    const banner = `
      <div class="matched-banner">
        <span class="big">🎉</span>
        ${matchTitle}
        <div class="sub">${matchSub} · ${esc(fmtTime(m.created_at))}</div>
      </div>`;
    let html = banner;
    let prevMine = null;
    for (const msg of msgs) {
      const mine = msg.sender_id === state.me.id;
      if (prevMine !== mine) html += `<div class="bubble-time ${mine ? "mine" : "theirs"}">${esc(fmtTime(msg.created_at))}</div>`;
      html += msg.event_id ? eventInviteCardHtml(msg, mine) : `<div class="bubble ${mine ? "mine" : "theirs"}">${esc(msg.body)}</div>`;
      prevMine = mine;
    }
    const box = $("chat-messages");
    box.innerHTML = html;
    box.querySelectorAll("[data-open-invited-event]").forEach((card) => card.addEventListener("click", () => {
      state.openEventId = card.dataset.openInvitedEvent;
      state.eventTime = "all";
      state.eventDirectDetail = true;
      showScreen("events");
    }));
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
    $("pf-hide-company").checked = state.me.company_visible === false;
    $("pf-gender").value = state.me.gender || "prefer_not_to_say";
    if (!state.profileEditing) $("pf-card-color").value = state.me.avatar_color || AVATAR_COLORS[0];
    const industries = parsedIndustries(state.me.industry);
    [1, 2, 3].forEach((number, index) => { $("pf-industry-" + number).value = industries[index] || ""; });
    $("pf-years").value = state.me.years_exp;
    $("pf-background").value = state.me.background;
    $("pf-looking").value = state.me.looking_for;
    $("pf-personality-tags").value = state.me.personality_tags || "";
    $("pf-custom-tag").value = state.me.custom_tag || "";
    $("profile-edit-form").hidden = !state.profileEditing;
    $("btn-edit-profile").hidden = state.profileEditing;
    renderGenderPickers();
    renderCardColorPickers();
    renderProfileExperiencePickers();
    renderPersonalityTagPicker("pf");
  }

  function startProfileEdit() {
    state.profileEditing = true;
    state.profileExperiencePickerOpen = null;
    state.profileAvatarImage = state.me.avatar_image || null;
    $("pf-card-color").value = state.me.avatar_color || AVATAR_COLORS[0];
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
      toast(t("profileSavedToast"));
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
    if (!name) return { error: t("nameRequired") };
    if (!title) return { error: t("titleRequired") };
    if (!industries.length) return { error: t("industryRequired") };
    if (Number.isNaN(years) || years < 0 || years > 60) return { error: t("yearsRequired") };
    if (!background) return { error: t("backgroundRequired") };
    if (!looking) return { error: t("lookingForRequired") };
    return { name, title, company, company_visible: !$(prefix + "-hide-company").checked, industry: industries.join(" | "), years_exp: years, background, looking_for: looking, personality_tags: parsedPersonalityTags($(prefix + "-personality-tags").value).join(" | "), custom_tag: $(prefix + "-custom-tag").value.trim(), avatar_color: $(prefix + "-card-color").value || AVATAR_COLORS[0], avatar_image: state.profileAvatarImage, gender: $(prefix + "-gender").value || "prefer_not_to_say" };
  }
  function collectIndustries(prefix) {
    return uniqueIndustries([1, 2, 3].map((number) => $(prefix + "-industry-" + number).value));
  }

  // ---------- Onboarding ----------
  function startOnboarding() {
    state.onboardingAvatarImage = null;
    $("ob-avatar-image").value = "";
    $("ob-gender").value = "prefer_not_to_say";
    $("ob-hide-company").checked = false;
    $("ob-card-color").value = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    [1, 2, 3].forEach((number) => { $("ob-industry-" + number).value = ""; });
    $("ob-years").value = "";
    $("ob-name").value = "";
    $("ob-title").value = "";
    $("ob-company").value = "";
    $("ob-background").value = "";
    $("ob-looking").value = "";
    $("ob-personality-tags").value = "";
    $("ob-custom-tag").value = "";
    $("ob-background-count").textContent = "0";
    $("ob-looking-count").textContent = "0";
    state.onboardingExperiencePickerOpen = null;
    $("ob-avatar-status").textContent = state.language === "zh" ? "支持 JPG、PNG 或 WebP。Yolink 会自动压缩照片。" : "JPG, PNG, or WebP. Your photo will be resized for Yolink.";
    renderGenderPickers();
    renderCardColorPickers();
    renderPersonalityTagPicker("ob");
    showObStep(1);
    showScreen("onboarding");
  }

  function showProfileGate() {
    $("profile-gate-modal").classList.add("visible");
    $("profile-gate-modal").setAttribute("aria-hidden", "false");
    $("btn-complete-profile").focus();
  }
  function closeProfileGate() {
    $("profile-gate-modal").classList.remove("visible");
    $("profile-gate-modal").setAttribute("aria-hidden", "true");
  }

  function showObStep(step) {
    state.obStep = step;
    [1, 2, 3].forEach((i) => { $("ob-step-" + i).style.display = i === step ? "" : "none"; });
    document.querySelectorAll("#ob-dots span").forEach((dot, i) => dot.classList.toggle("done", i < step));
    $("btn-ob-next").textContent = step === 3 ? t("createProfile") : t("next");
    $("ob-error").classList.remove("visible");
    renderOnboardingExperiencePickers();
  }

  async function obNext() {
    const err = $("ob-error");
    err.classList.remove("visible");
    const fail = (msg) => { err.textContent = msg; err.classList.add("visible"); };

    if (state.obStep === 1) {
      if (!$("ob-name").value.trim()) return fail(t("nameRequired"));
      if (!$("ob-title").value.trim()) return fail(t("titleRequired"));
      return showObStep(2);
    }
    if (state.obStep === 2) {
      const years = parseInt($("ob-years").value, 10);
      if (!collectIndustries("ob").length) return fail(t("industryRequired"));
      if (Number.isNaN(years) || years < 0 || years > 60) return fail(t("yearsRequired"));
      return showObStep(3);
    }
    // step 3 -> create
    if (!$("ob-background").value.trim()) return fail(t("backgroundRequired"));
    if (!$("ob-looking").value.trim()) return fail(t("lookingForRequired"));

    const btn = $("btn-ob-next");
    btn.disabled = true;
    try {
      const fields = {
        name: $("ob-name").value.trim(),
        title: $("ob-title").value.trim(),
        company: $("ob-company").value.trim() || null,
        company_visible: !$("ob-hide-company").checked,
        industry: collectIndustries("ob").join(" | "),
        years_exp: parseInt($("ob-years").value, 10),
        background: $("ob-background").value.trim(),
        looking_for: $("ob-looking").value.trim(),
        personality_tags: parsedPersonalityTags($("ob-personality-tags").value).join(" | "),
        custom_tag: $("ob-custom-tag").value.trim(),
        avatar_color: $("ob-card-color").value || AVATAR_COLORS[0],
        avatar_image: state.onboardingAvatarImage,
        gender: $("ob-gender").value || "prefer_not_to_say",
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
    let data;
    try {
      data = await api.fetchAll(state.me?.id);
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
    if (state.me) {
      const mine = profileById(state.me.id);
      if (mine) state.me = mine;
    }

    // detect brand-new matches involving me (skip on first load)
    const currentIds = new Set(myMatches().map((m) => m.id));
    if (state.me && prevMatchIds && !opts.silent) {
      for (const m of myMatches()) {
        if (!prevMatchIds.has(m.id)) {
          showMatchOverlay(m.id);
          break;
        }
      }
    }
    state.knownMatchIds = currentIds;

    // notify on new incoming messages when not looking at that chat
    if (state.me && !opts.silent && state.messages.length > prevMsgCount) {
      const fresh = state.messages.slice(prevMsgCount).filter(
        (m) => m.sender_id !== state.me.id && m.match_id !== state.openMatchId
      );
      if (fresh.length) {
        const sender = profileById(fresh.at(-1).sender_id);
        if (sender) toast(`💬 ${t("newMessageFrom")} ${sender.name.split(" ")[0]}`, true);
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
    const firstName = p.name.split(" ")[0];
    $("overlay-text").textContent = m.source === "staff"
      ? (state.language === "zh" ? `${firstName}，${t("matchOverlayStaff")}` : `The Yolink team thinks you and ${firstName} should talk.`)
      : (state.language === "zh" ? `你和 ${firstName} ${t("matchOverlayMutual")}` : `You and ${firstName} ${t("matchOverlayMutual")}`);
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

  async function enterGuestBrowse() {
    state.me = null;
    state.code = null;
    state.knownMatchIds = null;
    await refreshAll({ silent: true });
    showScreen("discover");
  }

  async function init() {
    // wire events
    $("btn-start-onboarding").addEventListener("click", startOnboarding);
    $("btn-browse-first").addEventListener("click", enterGuestBrowse);
    $("btn-ob-browse").addEventListener("click", enterGuestBrowse);
    $("ob-avatar-image").addEventListener("change", (event) => selectProfileImage(event.currentTarget, "onboardingAvatarImage", "ob-avatar-status"));
    $("btn-goto-login").addEventListener("click", () => showScreen("login"));
    $("btn-login").addEventListener("click", doLogin);
    $("login-code").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
    $("btn-login-back").addEventListener("click", () => showScreen("welcome"));
    $("btn-share-yolink").addEventListener("click", () => copyText("https://yolink-mvp-playground.vercel.app/", t("yolinkLinkCopiedToast")));
    $("btn-ob-next").addEventListener("click", obNext);
    $("btn-ob-back").addEventListener("click", obBack);
    ["ob", "pf"].forEach((prefix) => {
      $(prefix + "-gender-trigger").addEventListener("click", () => {
        state.profileGenderPickerOpen = state.profileGenderPickerOpen === prefix ? null : prefix;
        renderGenderPickers();
      });
      $(prefix + "-gender-menu").addEventListener("click", (event) => {
        const option = event.target.closest("[data-gender-picker]");
        if (!option) return;
        $(prefix + "-gender").value = option.dataset.genderValue;
        state.profileGenderPickerOpen = null;
        renderGenderPickers();
      });
      $(prefix + "-card-color-picker").addEventListener("click", (event) => {
        const option = event.target.closest("[data-card-color]");
        if (!option) return;
        $(prefix + "-card-color").value = option.dataset.cardColor;
        renderCardColorPickers();
        if (prefix === "pf" && state.profileEditing) {
          $("profile-preview").innerHTML = profileCardHtml({ ...state.me, avatar_color: option.dataset.cardColor });
        }
      });
    });
    [1, 2, 3].forEach((number) => {
      $("ob-industry-" + number + "-trigger").addEventListener("click", () => {
        state.onboardingExperiencePickerOpen = state.onboardingExperiencePickerOpen === "industry-" + number ? null : "industry-" + number;
        renderOnboardingExperiencePickers();
      });
      $("ob-industry-" + number + "-menu").addEventListener("click", (event) => {
        const option = event.target.closest("[data-onboarding-industry]");
        if (!option) return;
        $("ob-industry-" + number).value = option.dataset.industryValue;
        state.onboardingExperiencePickerOpen = null;
        renderOnboardingExperiencePickers();
      });
    });
    $("ob-years-trigger").addEventListener("click", () => {
      state.onboardingExperiencePickerOpen = state.onboardingExperiencePickerOpen === "years" ? null : "years";
      renderOnboardingExperiencePickers();
    });
    $("ob-years-menu").addEventListener("click", (event) => {
      const option = event.target.closest("[data-onboarding-years]");
      if (!option) return;
      $("ob-years").value = option.dataset.onboardingYears;
      state.onboardingExperiencePickerOpen = null;
      renderOnboardingExperiencePickers();
    });
    [1, 2, 3].forEach((number) => {
      $("pf-industry-" + number + "-trigger").addEventListener("click", () => {
        state.profileExperiencePickerOpen = state.profileExperiencePickerOpen === "industry-" + number ? null : "industry-" + number;
        renderProfileExperiencePickers();
      });
      $("pf-industry-" + number + "-menu").addEventListener("click", (event) => {
        const option = event.target.closest("[data-profile-industry]");
        if (!option) return;
        $("pf-industry-" + number).value = option.dataset.industryValue;
        state.profileExperiencePickerOpen = null;
        renderProfileExperiencePickers();
      });
    });
    $("pf-years-trigger").addEventListener("click", () => {
      state.profileExperiencePickerOpen = state.profileExperiencePickerOpen === "years" ? null : "years";
      renderProfileExperiencePickers();
    });
    $("pf-years-menu").addEventListener("click", (event) => {
      const option = event.target.closest("[data-profile-years]");
      if (!option) return;
      $("pf-years").value = option.dataset.profileYears;
      state.profileExperiencePickerOpen = null;
      renderProfileExperiencePickers();
    });
    $("btn-copy-code").addEventListener("click", () => copyText(state.code, t("codeCopiedToast")));
    $("btn-code-done").addEventListener("click", enterApp);
    $("btn-profile-copy-code").addEventListener("click", () => copyText(state.code, t("codeCopiedToast")));
    $("btn-edit-profile").addEventListener("click", startProfileEdit);
    document.querySelectorAll("[data-language-toggle]").forEach((button) => button.addEventListener("click", () => {
      state.language = state.language === "en" ? "zh" : "en";
      localStorage.setItem(LANGUAGE_KEY, state.language);
      const renderers = { discover: renderDiscover, events: renderEvents, "my-events": renderMyEvents, requests: renderRequests, matches: renderMatches, profile: renderProfileScreen };
      renderers[state.currentScreen]?.();
      renderEventPickers();
      applyLanguage();
    }));
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
    $("btn-close-request-modal").addEventListener("click", closeRequestComposer);
    $("btn-cancel-request").addEventListener("click", closeRequestComposer);
    $("btn-submit-request").addEventListener("click", sendRequestClick);
    $("btn-close-event-share").addEventListener("click", closeEventShare);
    $("btn-cancel-event-share").addEventListener("click", closeEventShare);
    $("btn-copy-event-link").addEventListener("click", () => { if (state.eventShareId) copyEventLink(state.eventShareId); });
    $("btn-send-event-invite").addEventListener("click", sendEventInviteClick);
    $("btn-close-profile-gate").addEventListener("click", closeProfileGate);
    $("btn-keep-browsing").addEventListener("click", closeProfileGate);
    $("btn-complete-profile").addEventListener("click", () => { closeProfileGate(); startOnboarding(); });
    $("btn-close-member").addEventListener("click", closeMemberProfile);
    $("btn-open-requests").addEventListener("click", () => showScreen("requests"));
    $("btn-requests-back").addEventListener("click", () => showScreen("matches"));
    $("btn-open-my-events").addEventListener("click", () => { if (!state.me) showProfileGate(); else showScreen("my-events"); });
    $("btn-my-events-back").addEventListener("click", () => showScreen("events"));
    $("btn-show-event-form").addEventListener("click", showEventForm);
    $("btn-create-my-event").addEventListener("click", showEventForm);
    $("btn-create-event").addEventListener("click", createEventClick);
    $("btn-cancel-event-form").addEventListener("click", cancelEventForm);
    $("event-online").addEventListener("change", syncEventOnlineFields);
    $("event-location").addEventListener("input", searchEventLocation);
    $("event-location").addEventListener("blur", () => window.setTimeout(hideLocationSuggestions, 140));
    $("btn-refresh-discover").addEventListener("click", refreshDiscoverFromPull);
    // Capture at document level so report buttons keep working even when the
    // discover-list content is refreshed while the app is open.
    document.addEventListener("click", (event) => {
      const reportButton = event.target.closest?.("[data-report]");
      if (!reportButton) return;
      event.preventDefault();
      reportProfile(reportButton.dataset.report, reportButton.dataset.reportName);
    }, true);
    const discoverScreen = $("screen-discover");
    discoverScreen.addEventListener("touchstart", (event) => {
      if (state.currentScreen !== "discover" || discoverRefreshing || window.scrollY > 0) return;
      discoverPullStartY = event.touches[0]?.clientY ?? null;
      discoverPullDistance = 0;
    }, { passive: true });
    discoverScreen.addEventListener("touchmove", (event) => {
      if (discoverPullStartY === null || discoverRefreshing) return;
      const distance = Math.max(0, (event.touches[0]?.clientY ?? discoverPullStartY) - discoverPullStartY);
      if (!distance) return;
      discoverPullDistance = Math.min(distance, DISCOVER_PULL_THRESHOLD + 32);
      event.preventDefault();
      renderDiscoverPullRefresh({ distance: discoverPullDistance });
    }, { passive: false });
    discoverScreen.addEventListener("touchend", () => {
      const shouldRefresh = discoverPullDistance >= DISCOVER_PULL_THRESHOLD;
      discoverPullStartY = null;
      discoverPullDistance = 0;
      if (shouldRefresh) refreshDiscoverFromPull();
      else renderDiscoverPullRefresh();
    });
    discoverScreen.addEventListener("touchcancel", () => {
      discoverPullStartY = null;
      discoverPullDistance = 0;
      renderDiscoverPullRefresh();
    });
    const eventsScreen = $("screen-events");
    eventsScreen.addEventListener("touchstart", (event) => {
      if (state.currentScreen !== "events" || eventsRefreshing || window.scrollY > 0) return;
      eventsPullStartY = event.touches[0]?.clientY ?? null;
      eventsPullDistance = 0;
    }, { passive: true });
    eventsScreen.addEventListener("touchmove", (event) => {
      if (eventsPullStartY === null || eventsRefreshing) return;
      const distance = Math.max(0, (event.touches[0]?.clientY ?? eventsPullStartY) - eventsPullStartY);
      if (!distance) return;
      eventsPullDistance = Math.min(distance, DISCOVER_PULL_THRESHOLD + 32);
      event.preventDefault();
      renderEventsPullRefresh({ distance: eventsPullDistance });
    }, { passive: false });
    eventsScreen.addEventListener("touchend", () => {
      const shouldRefresh = eventsPullDistance >= DISCOVER_PULL_THRESHOLD;
      eventsPullStartY = null;
      eventsPullDistance = 0;
      if (shouldRefresh) refreshEventsFromPull();
      else renderEventsPullRefresh();
    });
    eventsScreen.addEventListener("touchcancel", () => {
      eventsPullStartY = null;
      eventsPullDistance = 0;
      renderEventsPullRefresh();
    });
    $("event-date-trigger").addEventListener("click", () => toggleEventPicker("date"));
    $("event-time-trigger").addEventListener("click", () => toggleEventPicker("time"));
    $("event-visibility-trigger").addEventListener("click", () => toggleEventPicker("visibility"));
    $("event-visibility-menu").addEventListener("click", (event) => {
      const option = event.target.closest("[data-event-visibility]");
      if (!option) return;
      $("event-visibility").value = option.dataset.eventVisibility;
      state.eventPickerOpen = null;
      renderEventPickers();
    });
    [1, 2].forEach((number) => {
      $("event-industry-" + number + "-trigger").addEventListener("click", () => toggleEventPicker("industry-" + number));
      $("event-industry-" + number + "-menu").addEventListener("click", (event) => {
        const industryButton = event.target.closest("[data-event-industry]");
        if (!industryButton) return;
        $("event-industry-" + number).value = industryButton.dataset.industryValue;
        state.eventPickerOpen = null;
        renderEventPickers();
      });
    });
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
      btn.addEventListener("click", () => {
        if (!state.me && !["discover", "events"].includes(btn.dataset.screen)) {
          if (btn.dataset.screen === "profile") startOnboarding();
          else showProfileGate();
          return;
        }
        showScreen(btn.dataset.screen);
      })
    );
    [["ob-background", "ob-background-count"], ["ob-looking", "ob-looking-count"]].forEach(([inputId, countId]) => {
      $(inputId).addEventListener("input", () => { $(countId).textContent = $(inputId).value.length; });
    });

    renderEventPickers();
    applyLanguage();
    new MutationObserver(() => {
      if (state.language === "zh") localizeUi();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });

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
