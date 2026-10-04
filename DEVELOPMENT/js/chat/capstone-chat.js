(() => {
  "use strict";
  const api = window.CapstoneApi;

  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");
  const log = document.querySelector(".chat-log");
  const clearButton = document.querySelector("#clear-chat");
  const chatPanel = document.querySelector("#assistant");
  const launcher = document.querySelector("#chat-launcher");
  const minimizeButton = document.querySelector("#minimize-chat");
  const openButtons = [launcher, ...document.querySelectorAll("[data-open-chat]")];
  const supportDialog = document.querySelector("#support-dialog");
  const supportForm = document.querySelector("#support-form");
  const supportStatus = document.querySelector("#support-status");
  const accountStatus = document.querySelector("#account-status");
  const sampleStart = document.querySelector("#sample-account-start");
  const sampleEnd = document.querySelector("#sample-account-end");
  const accountRetry = document.querySelector("#account-retry");
  const attachmentInput = document.querySelector("#ticket-attachments");
  const attachmentList = document.querySelector("#attachment-list");
  const attachmentStatus = document.querySelector("#attachment-status");
  const sharedDialog = document.querySelector("#shared-information-dialog");
  const sharedForm = document.querySelector("#shared-information-form");
  const sharedStatus = document.querySelector("#shared-information-status");
  const sharedList = document.querySelector("#loaded-source-list");
  const sharedEmpty = document.querySelector("#loaded-source-empty");
  const sharedModeStatus = document.querySelector("#shared-mode-status");
  const sharedModeDetail = document.querySelector("#shared-mode-detail");
  const sharedBar = document.querySelector(".shared-information-bar");
  const sharedLibrary = window.CapstoneSharedInformation;
  const sharedStore = sharedLibrary?.createSharedInformationStore({
    cryptoLike:window.crypto,
    resolvePortalDestination:window.CapstonePortalNavigation?.resolvePortalDestination
  }) || null;
  const attachmentPolicy = window.CapstoneAttachmentPolicy;
  const contactPolicy = window.CapstoneContactPolicy;
  const contactFields = contactPolicy.bindContactFields({
    method: document.querySelector("#request-contact-method"),
    phone: document.querySelector("#request-contact-phone"),
    phoneField: document.querySelector("#request-phone-field")
  });
  let selectedAttachments = [];
  const conversation = [];
  let lastQuestion = "";
  let lastTopic = "";
  let searchSequence = 0;
  let currentSession = null;
  let accountBusy = false;
  let submittingTicket = false;
  let identityWasAccount = false;
  let accountRequest = 0;
  let contactAccountKey = null;
  let lastQuestionPrivate = false;
  let sharedRoutingLock = false;
  let sharedExpiryTimer = null;

  function openChat() {
    chatPanel.hidden = false;
    launcher.hidden = true;
    openButtons.forEach((button) => button.setAttribute("aria-expanded", "true"));
    (input.disabled ? chatPanel : input).focus({ preventScroll: true });
  }

  function minimizeChat() {
    chatPanel.hidden = true;
    launcher.hidden = false;
    openButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    launcher.focus({ preventScroll: true });
  }

  openButtons.forEach((button) => button.addEventListener("click", openChat));
  minimizeButton.addEventListener("click", minimizeChat);
  chatPanel.addEventListener("keydown", (event) => {
    // The separate support dialog owns Escape while it is open.
    if (event.key === "Escape" && !supportDialog.open) {
      event.preventDefault();
      event.stopPropagation();
      minimizeChat();
    }
  });

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function scrollToLatest(answer) {
    // Keep the answer's beginning visible when citations/follow-up chips make a
    // response taller than the popup. Never scroll the surrounding host page.
    if (answer?.getBoundingClientRect && !chatPanel.hidden) {
      log.scrollTop = Math.max(0, log.scrollTop + answer.getBoundingClientRect().top - log.getBoundingClientRect().top - 12);
    } else log.scrollTop = log.scrollHeight;
  }

  function addUserMessage(text, { sensitive=false } = {}) {
    const message = createElement("article", "message user-message");
    message.append(createElement("div", "message-label", "YOU"));
    message.append(createElement("p", "", text));
    log.append(message);
    if (!window.CapstonePortal && !sensitive) conversation.push({ role: "User", text });
    scrollToLatest();
  }

  function addAssistantText(text, note, { sensitive=false } = {}) {
    const message = createElement("article", "message assistant-message");
    message.append(createElement("div", "message-label", "MIRA"));
    message.append(createElement("p", "", text));
    if (note) message.append(createElement("p", "message-note", note));
    log.append(message);
    if (!window.CapstonePortal && !sensitive) conversation.push({ role: "Assistant", text });
    scrollToLatest();
    return message;
  }

  function addLoadingMessage() {
    const message = createElement("article", "message assistant-message loading-message");
    message.append(createElement("div", "message-label", "SEARCHING APPROVED CONTENT"));
    const dots = createElement("div", "typing-dots");
    dots.innerHTML = "<span></span><span></span><span></span>";
    message.append(dots);
    log.append(message);
    scrollToLatest();
    return message;
  }

  function isCapstoneUrl(value) {
    try {
      const url = new URL(value);
      return url.origin === "https://capstone.cs.fiu.edu" && !url.username && !url.password;
    } catch { return false; }
  }

  function isReviewedPublicSource(value) {
    try {
      const url = new URL(value);
      return !url.username && !url.password && url.origin === "https://brand.fiu.edu" && ["/logos/","/downloads/","/visual-styles/colors/"].some(path=>url.pathname===path||url.pathname.startsWith(path));
    } catch { return false; }
  }

  function isReviewedPortalDestination(match) {
    if (match?.sourceKind !== "portal-navigation") return false;
    try {
      const url = new URL(match.url);
      return !url.username && !url.password && (
        (url.origin === "https://capstone.cs.fiu.edu" && url.pathname === "/portal") ||
        (url.origin === "https://fiu.instructure.com" && url.pathname === "/courses/262782" && !url.search && !url.hash)
      );
    } catch { return false; }
  }

  function addKeywordLinks(container, links = []) {
    const safeLinks = links.filter(link => isCapstoneUrl(link.url) && link.keywords?.length).slice(0, 4);
    if (!safeLinks.length) return;
    const group = createElement("nav", "keyword-links");
    group.setAttribute("aria-label", "Related Capstone site links");
    group.append(createElement("div", "keyword-links-heading", "RELATED SITE LINKS"));
    for (const link of safeLinks) {
      const anchor = createElement("a", "keyword-link");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      const access = link.access === "authenticated" ? "Sign-in required" : "Public page";
      anchor.setAttribute("aria-label", `${link.keywords.join(", ")}: ${link.title}. ${access}. Opens in a new tab.`);
      anchor.append(
        createElement("strong", "keyword-link-words", `${link.keywords.join(" · ")} ↗`),
        createElement("span", "keyword-link-title", link.title),
        createElement("span", "keyword-link-meta", `${link.sourceTitle || link.section} · ${access}`)
      );
      group.append(anchor);
    }
    container.append(group);
  }

  function sourceHref(match) {
    let href;
    if (isCapstoneUrl(match.url) || isReviewedPublicSource(match.url) || isReviewedPortalDestination(match)) href = match.url;
    else if (/^pages\/syllabus\.html#(?:syllabus-[a-z0-9-]+|canvas-assignments|contact-help|sprint-planning|dashboard-personal)$/.test(match.url)) href = new URL(match.url, api.baseUrl).href;
    return href || "";
  }

  function addSourceCard(container, match) {
    const href = sourceHref(match);
    if (!href) return;
    const source = createElement("a", "source-card");
    source.href = href;
    if (match.sourceKind !== "portal-navigation") {
      source.target = "_blank";
      source.rel = "noopener noreferrer";
    }
    const exactPortal = match.sourceKind === "portal-navigation" && ["exact-section", "exact-external"].includes(match.navigationCapability);
    const kind = match.sourceKind === "portal-navigation" ? "PORTAL LINK · PERSONAL DATA STAYS IN PORTAL" : match.sourceKind === "syllabus" ? "SYLLABUS · pages " + match.sourcePages : match.sourceKind === "prototype" ? "PROTOTYPE LIMITATION" : match.access === "authenticated" ? "SIGN-IN REQUIRED" : "CAPSTONE SOURCE";
    const label = createElement("span", "source-kicker", `${kind} · ${match.section}`);
    const title = createElement("strong", "", match.sourceTitle || match.title);
    const actionText = match.sourceKind === "portal-navigation"
      ? match.navigationCapability === "exact-external" ? "Open " + match.portalSection + " →" : exactPortal ? "Open " + match.portalSection + " in portal →" : "Open portal → · then choose " + match.portalSection
      : match.access === "authenticated" ? "Open in portal ↗ · sign-in required" : "Open this section ↗";
    const action = createElement("span", "source-action", actionText);
    source.append(label, title, action);
    container.append(source);
  }

  function createActionButton(label, className, action) {
    const button = createElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  function resetConversation(notice, { sensitive=false } = {}) {
    searchSequence++;
    const messages = log.querySelectorAll(".user-message, .assistant-message, .result-choices, .feedback-row");
    messages.forEach((message, index) => { if (index > 0) message.remove(); });
    conversation.length = 0;
    lastQuestion = "";
    lastQuestionPrivate = false;
    lastTopic = "";
    input.disabled = false;
    form.querySelector("button[type='submit']").disabled = false;
    input.value = "";
    if (notice) addAssistantText(notice, sensitive ? "Temporary local session · nothing was sent to Supabase, tickets, or an AI provider" : undefined, { sensitive });
  }

  function sharedSourceDescription(source) {
    const context = [source.term,source.sprint].filter(Boolean).join(" · ");
    return `${source.label} · ${source.category}${context ? " · " + context : ""} · expires ${new Date(source.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
  }

  function renderSharedSources(state = sharedStore?.status()) {
    if (!sharedStore || !state || !sharedList) return;
    const all = [...state.shared,...state.sample];
    sharedList.replaceChildren();
    sharedList.hidden = !all.length;
    sharedEmpty.hidden = Boolean(all.length);
    for (const source of all) {
      const item=createElement("li",source.mode === state.activeMode ? "active-shared-source" : "");
      const copy=createElement("div","");
      copy.append(createElement("strong","",source.title),createElement("span","",sharedSourceDescription(source)));
      item.append(copy);
      if (source.mode === "shared") item.append(createActionButton("Remove this source","secondary-action",()=>{
        if (!sharedStore.remove(source.id)) return;
        sharedRoutingLock=false;
        resetConversation("That shared source and its dependent answers were removed.",{sensitive:true});
        refreshSharedUi();
      }));
      else item.append(createElement("span","","Fictional sample"));
      sharedList.append(item);
    }
    const activateShared=document.querySelector("#activate-shared-information");
    const activateSample=document.querySelector("#activate-sample-information");
    if(activateShared)activateShared.hidden=!state.shared.length||state.activeMode==="shared";
    if(activateSample)activateSample.hidden=!state.sample.length||state.activeMode==="sample";
  }

  function scheduleSharedExpiry(state) {
    if (sharedExpiryTimer) window.clearTimeout(sharedExpiryTimer);
    sharedExpiryTimer=null;
    if (!state?.nextExpiry) return;
    const delay=Math.max(0,state.nextExpiry-Date.now()+25);
    sharedExpiryTimer=window.setTimeout(()=>refreshSharedUi(),Math.min(delay,2147483647));
  }

  function refreshSharedUi() {
    if (!sharedStore) return null;
    const state=sharedStore.status();
    if (state.expiredCount) {
      sharedRoutingLock=true;
      resetConversation("Your temporary information expired after five minutes. Share an updated copy before asking another question about it.",{sensitive:true});
    }
    if (sharedModeStatus && sharedModeDetail) {
      sharedBar?.classList.toggle("sample-active",state.activeMode==="sample");
      if (state.activeMode==="shared") {
        sharedModeStatus.textContent=`Shared information active · ${state.shared.length} source${state.shared.length===1?"":"s"}`;
        sharedModeDetail.textContent="User-provided, unverified text · local browser memory · expires within five minutes.";
      } else if (state.activeMode==="sample") {
        sharedModeStatus.textContent="Sample data — not your account";
        sharedModeDetail.textContent="Fictional local sources are active and will never be substituted for live data.";
      } else if (sharedRoutingLock) {
        sharedModeStatus.textContent="Shared information expired";
        sharedModeDetail.textContent="Start a new demo session or share an updated copy; personal questions will not be sent elsewhere.";
      } else {
        sharedModeStatus.textContent="No shared information loaded";
        sharedModeDetail.textContent="Public and course answers are active.";
      }
    }
    renderSharedSources(state);
    scheduleSharedExpiry(state);
    return state;
  }

  function addSharedDestination(container,destination) {
    if (!destination) return;
    const reviewed={sourceKind:"portal-navigation",url:destination.url};
    if (!isReviewedPortalDestination(reviewed)) return;
    const link=createElement("a","source-card");
    link.href=destination.url;
    link.append(
      createElement("span","source-kicker","SUGGESTED PORTAL DESTINATION · CURRENT CONTENTS NOT CHECKED"),
      createElement("strong","",destination.label),
      createElement("span","source-action",destination.signedInVerified?`Open ${destination.label} in portal →`:`Open portal → then choose ${destination.label}`)
    );
    container.append(link);
  }

  function renderSharedAnswer(result) {
    if (result.status==="expired") sharedRoutingLock=true;
    const sample=result.mode==="sample";
    const note=sample?"Sample data — not your account · fictional browser-memory source":"Based only on user-provided, unverified text · not a live account connection";
    const message=addAssistantText(result.answer,note,{sensitive:true});
    lastTopic=(result.sources||[]).map(source=>source.sourceId).join(",");
    for(const source of result.sources||[]){
      const section=createElement("section","shared-evidence");
      section.append(
        createElement("div","shared-source-label",source.label.toUpperCase()),
        createElement("h3","",source.title),
        createElement("blockquote","",source.excerpt),
        createElement("p","message-note",`${source.category}${source.term?" · "+source.term:""}${source.sprint?" · "+source.sprint:""} · Added ${new Date(source.addedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}. Added time is not a portal publication time.`)
      );
      addSharedDestination(section,source.destination);
      message.append(section);
    }
    if (!(result.sources||[]).length) addSharedDestination(message,result.destination);
    const actions=createElement("div","follow-up-questions");
    actions.setAttribute("aria-label","Shared-information actions");
    if ((result.sources||[]).length) {
      actions.append(createActionButton("Where does it say that?","follow-up-button",()=>submitQuestion("Where does it say that?",lastTopic)));
      if ((result.sources||[]).some(source=>source.destination)) actions.append(createActionButton("Take me there","follow-up-button",()=>submitQuestion("Take me there",lastTopic)));
    }
    actions.append(createActionButton("Manage shared information","follow-up-button",()=>sharedDialog?.showModal()));
    message.append(actions);
    scrollToLatest(message);
  }

  function updateAccountControls() {
    const ready = currentSession && ["guest", "demo", "signed-in"].includes(currentSession.status);
    supportForm.querySelector("button[type='submit']").disabled = accountBusy || submittingTicket || !ready;
    for (const field of [supportForm.elements.name, supportForm.elements.email]) {
      field.readOnly = accountBusy || submittingTicket || currentSession?.status !== "guest";
    }
    for (const button of [sampleStart, sampleEnd, accountRetry]) {
      button.disabled = accountBusy || submittingTicket;
    }
    attachmentInput.disabled = submittingTicket;
    contactFields.setBusy(submittingTicket);
    attachmentList.querySelectorAll("button").forEach((button) => { button.disabled = submittingTicket; });
    document.querySelectorAll(".dialog-close, [data-close-dialog]").forEach((button) => { button.disabled = submittingTicket; });
  }

  function renderAttachments() {
    attachmentList.replaceChildren();
    attachmentList.hidden = selectedAttachments.length === 0;
    selectedAttachments.forEach((file, index) => {
      const item = createElement("li");
      item.append(createElement("span", "", `${file.name} (${Math.max(1, Math.ceil(file.size / 1024))} KB)`));
      const remove = createActionButton("Remove", "secondary-action", () => {
        selectedAttachments.splice(index, 1);
        attachmentStatus.textContent = "";
        renderAttachments();
        attachmentInput.focus();
      });
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      item.append(remove);
      attachmentList.append(item);
    });
  }

  attachmentInput.addEventListener("change", () => {
    const next = [...selectedAttachments, ...attachmentInput.files];
    const error = attachmentPolicy.validate(next);
    attachmentInput.value = "";
    attachmentStatus.textContent = error;
    if (error) return;
    selectedAttachments = next;
    renderAttachments();
  });

  function readAttachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, size: file.size, data: String(reader.result).split(",")[1] });
      reader.onerror = reader.onabort = () => reject(new Error(`Could not read ${file.name}. Remove it and select the document again.`));
      reader.readAsDataURL(file);
    });
  }

  async function loadAccount() {
    const requestNumber = ++accountRequest;
    currentSession = null;
    accountBusy = true;
    accountStatus.textContent = "Checking account details…";
    sampleStart.hidden = sampleEnd.hidden = accountRetry.hidden = true;
    updateAccountControls();
    try {
      const response = await api.fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
      const session = await api.readJson(response);
      if (!response.ok) throw new Error(session.error || "Account details are unavailable.");
      if (requestNumber !== accountRequest) return;
      const nextContactAccountKey = session.account ? session.status + ":" + session.account.id + ":" + session.account.email : session.status;
      if (contactAccountKey !== null && contactAccountKey !== nextContactAccountKey) contactFields.reset();
      contactAccountKey = nextContactAccountKey;
      currentSession = session;
      if (session.account) {
        supportForm.elements.name.value = session.account.name;
        supportForm.elements.email.value = session.account.email;
        identityWasAccount = true;
      } else if (identityWasAccount) {
        supportForm.elements.name.value = "";
        supportForm.elements.email.value = "";
        identityWasAccount = false;
      }
      const notices = {
        "signed-in": "Your name and email were filled from your signed-in account. These details are checked again when you submit.",
        demo: "Sample account only — not your FIU login. Name and email are filled automatically to demonstrate the connected experience.",
        guest: "FIU login is not connected to this standalone demo. Enter your contact details." + (session.demoAvailable ? " You can also try the sample account below." : ""),
        "sign-in-required": "Sign in to the Capstone portal, then check your account again. A signed-in account is required to submit."
      };
      accountStatus.textContent = notices[session.status] || "Account details are unavailable.";
      sampleStart.hidden = !session.demoAvailable || session.status === "demo";
      sampleEnd.hidden = session.status !== "demo";
      accountRetry.hidden = session.status !== "sign-in-required";
    } catch (error) {
      if (requestNumber !== accountRequest) return;
      if (identityWasAccount) {
        supportForm.elements.name.value = "";
        supportForm.elements.email.value = "";
        identityWasAccount = false;
      }
      accountStatus.textContent = `${error.message} Your request has not been submitted. Check your account again to continue.`;
      accountRetry.hidden = false;
    } finally {
      if (requestNumber === accountRequest) {
        accountBusy = false;
        updateAccountControls();
      }
    }
  }

  async function changeSampleAccount(action) {
    accountBusy = true;
    updateAccountControls();
    supportStatus.textContent = "";
    try {
      const response = await api.fetch("/api/demo-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await api.readJson(response);
      if (!response.ok) throw new Error(result.error || "Sample account could not be changed.");
    } catch (error) {
      supportStatus.className = "form-status error";
      supportStatus.textContent = error.message;
    } finally {
      await loadAccount();
    }
  }

  sampleStart.addEventListener("click", () => void changeSampleAccount("start"));
  sampleEnd.addEventListener("click", () => void changeSampleAccount("end"));
  accountRetry.addEventListener("click", () => void loadAccount());

  async function openSupportDialog(question = lastQuestion) {
    if (window.CapstonePortal) {
      addAssistantText("Ticket creation and transcript sharing are disabled in this local private portal preview. Use the normal prototype separately with fictional information.");
      return;
    }
    const questionField = supportForm.elements.question;
    if (!lastQuestionPrivate && question && !questionField.value) questionField.value = question;
    if (lastQuestionPrivate) {
      questionField.value="";
      supportForm.elements.includeTranscript.checked=false;
      supportStatus.className="form-status";
      supportStatus.textContent="Temporary shared text and questions are excluded. Enter only information you deliberately want saved as a fictional support request.";
    } else supportStatus.textContent = "";
    supportDialog.showModal();
    await loadAccount();
    if (supportDialog.open) {
      (currentSession?.account ? questionField : supportForm.elements.name).focus();
    }
  }

  function addFeedback(message) {
    const feedback = createElement("div", "feedback-row");
    feedback.append(createElement("span", "", "Did this answer your question?"));
    feedback.append(
      createActionButton("Yes", "feedback-button", () => {
        feedback.replaceChildren(createElement("span", "resolved-note", "✓ Glad that helped. Ask another question anytime."));
      }),
      createActionButton("I still need help", "feedback-button secondary", () => openSupportDialog())
    );
    message.append(feedback);
  }

  function renderAnswer(match, links = [], result = {}) {
    const answerMatches = (result.matches || [match]).filter(item => item && typeof item.id === "string").slice(0, 5);
    lastTopic = answerMatches.map(item => item.id).join(",") || match.id;
    const message = addAssistantText(match.answer);
    addKeywordLinks(message, links);
    if (!links.some(link => link.id === match.id && link.url === match.url && isCapstoneUrl(link.url) && link.keywords?.length)) {
      addSourceCard(message, match);
    }
    for (const related of answerMatches.slice(1)) addSourceCard(message, related);
    if (result.responseStatus) {
      message.append(createElement("p", "message-note", "Response status: " + String(result.responseStatus).replaceAll("_", " ")));
    }
    if (result.missingEvidence) message.append(createElement("p", "message-note", "Coverage limit: " + result.missingEvidence));
    const followUps = createElement("div", "follow-up-questions");
    followUps.setAttribute("aria-label", "Suggested follow-up questions");
    followUps.append(createElement("p", "message-note", "Keep exploring this topic:"));
    const prompts = match.followUps?.length ? match.followUps : ["What are the course deadlines?", "Where do I submit my course work?", "How do I contact the professor?"];
    prompts.filter(question => typeof question === "string" && question.length <= 500).slice(0, 5).forEach(question => {
      followUps.append(createActionButton(question, "follow-up-button", () => submitQuestion(question, match.id)));
    });
    message.append(followUps);
    addFeedback(message);
    scrollToLatest(message);
    if (result.navigationRequested && answerMatches.length === 1 && answerMatches[0].sourceKind !== "portal-navigation" && /^(?:take me there|open it|open that|open this section|show me (?:the )?instructions|show me that section|where does it say that|open the (?:first|second|third) source)[.!?]*$/i.test(lastQuestion.trim())) {
      const href = sourceHref(answerMatches[0]);
      if (href) window.open?.(href, "_blank", "noopener,noreferrer");
    }
  }

  function renderChoices(matches, links = [], result = {}) {
    const message = addAssistantText(
      "I found a few related Capstone topics. Which one best matches what you need?",
      "Choosing a topic lets me use its reviewed answer instead of guessing."
    );
    if (result.missingEvidence) message.append(createElement("p", "message-note", "What I still need: " + result.missingEvidence));
    const choices = createElement("div", "result-choices");
    matches.forEach((match) => {
      const button = createActionButton(match.title, "result-choice", () => {
        if (input.disabled) return;
        choices.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        addUserMessage("Tell me about " + match.title);
        renderAnswer(match, links.filter(link => link.id === match.id));
      });
      const meta = createElement("span", "", `${match.section} · ${match.access === "authenticated" ? "sign-in required" : "public"}`);
      button.append(meta);
      choices.append(button);
    });
    message.append(choices);
    addKeywordLinks(message, links);
    scrollToLatest(message);
  }

  function renderUnmatched(links = [], scopeNote) {
    lastTopic = "";
    const message = addAssistantText(
      "I couldn’t find that answer in the approved Capstone content.",
      scopeNote || "Try a course topic, sprint number, or syllabus question. For course questions, contact the instructor through Canvas Inbox. You can also create a prototype support request."
    );
    addKeywordLinks(message, links);
    const actions = createElement("div", "message-actions");
    actions.append(
      createActionButton("Try another question", "secondary-action", () => input.focus()),
      createActionButton("Create support request", "primary-action", () => openSupportDialog())
    );
    message.append(actions);
    scrollToLatest(message);
  }

  function indexedLink(source, result) {
    try {
      const target = new URL(source.url), scope = result.navigationScope;
      const prefix = (value, part) => part === "/" || value === part || value.startsWith(part.endsWith("/") ? part : part + "/");
      const path = decodeURIComponent(target.pathname);
      if (target.protocol !== "https:" || target.username || target.password || target.port || /[\\%\u0000-\u001f]/.test(path)) return null;
      if (!scope?.allowedOrigins?.includes(target.origin) || !scope.allowedPaths.some(p => prefix(path,p)) || scope.excludedPaths.some(p => prefix(path.toLowerCase(),p.toLowerCase()))) return null;
      const action = result.navigation.find(item => item.targetSourceId === source.id && item.url === source.url);
      return action ? { url:target.href,label:action.label } : null;
    } catch { return null; }
  }

  function renderIndexed(result, question) {
    const sources = (result.sources || []).slice(0,5).filter(source => indexedLink(source,result));
    const offeredSourceIds = sources.map(source => source.id).join(",");
    lastTopic = offeredSourceIds;
    const message = addAssistantText(result.answer,"Indexed website · source excerpts · no AI generation or live check");
    const choices = result.answerStatus === "clarification_needed";
    for (const source of sources) {
      const group = createElement("section","indexed-source");
      group.append(createElement("h3","",source.pageTitle + " — " + source.sectionTitle));
      if (!choices) group.append(createElement("blockquote","indexed-excerpt",source.excerpt));
      group.append(createElement("p","message-note","Indexed: " + source.indexed_at + (source.truncated ? " · Partial excerpt; read all conditions in the source." : "")));
      const destination = indexedLink(source,result);
      const link = createElement("a","source-card",destination.label + " ↗" + (!source.anchor ? " · Look for: " + source.sectionTitle : ""));
      link.href = destination.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.setAttribute("aria-label",destination.label + ": " + source.sectionTitle + ". Opens in a new tab.");
      group.append(link);
      if (choices) group.append(createActionButton("Use this source","follow-up-button",()=>submitQuestion("Where does it say that?",source.id)));
      message.append(group);
    }
    if (sources.length) message.append(createActionButton("Where does it say that?","follow-up-button",()=>submitQuestion("Where does it say that?",offeredSourceIds)));
    addFeedback(message);
    scrollToLatest(message);
    // Only an explicit navigation request can open a destination. A regular
    // question merely offers standard links. Popup-blocking browsers retain
    // the same clickable link, and the current conversation stays untouched.
    if (result.navigationRequested && !choices && sources.length === 1 && /^(?:take me there|open it|open that|show me that section)[.!?]*$/i.test(question.trim())) {
      window.open?.(indexedLink(sources[0],result).url,"_blank","noopener,noreferrer");
    }
  }

  function clearPortalConversation() {
    searchSequence++;
    log.replaceChildren();
    conversation.length = 0; lastTopic = ""; lastQuestion = ""; input.value = "";
    input.disabled = false; form.querySelector("button[type='submit']").disabled = false;
  }
  if (window.CapstonePortal) window.addEventListener("capstone-portal-clear",clearPortalConversation);

  function renderPersonal(result,question) {
    const connected=window.CapstonePortal?.accepts(result);
    if(result.sources?.length&&!connected){clearPortalConversation();addAssistantText("The private answer no longer belongs to a verified session. Reconnect before asking again.");return;}
    if(result.publicResult?.indexed) renderIndexed(result.publicResult, "");
    else if(result.publicResult?.status==="matched") renderAnswer(result.publicResult.matches[0],result.publicResult.links||[],result.publicResult);
    const message=addAssistantText(result.answer,"Private portal · source excerpts · not a complete account record");
    const sources=connected?(result.sources||[]).filter(s=>/^private-[a-f0-9]{24}$/.test(s.id)&&s.url==="https://capstone.cs.fiu.edu/portal"):[];
    lastTopic=sources.map(s=>s.id).join(",");
    const open=async source=>{
      try {const destination=await window.CapstonePortal.destination(source.id);window.open?.(destination.url,"_blank","noopener,noreferrer");}
      catch {clearPortalConversation();addAssistantText("Your portal source is no longer verified. Reconnect before opening it.");}
    };
    for(const source of sources){
      const section=createElement("section","indexed-source");
      section.append(createElement("h3","",source.sectionTitle));
      if(result.answerStatus!=="clarification_needed")section.append(createElement("blockquote","indexed-excerpt",source.excerpt));
      section.append(createElement("p","message-note","Retrieved: "+source.retrievedAt+" · Portal → "+source.section+". "+source.coverage));
      section.append(createActionButton("View in portal · "+source.section,"source-card",()=>void open(source)));
      if(result.answerStatus==="clarification_needed")section.append(createActionButton("Use this private source","follow-up-button",()=>submitQuestion("Where does it say that?",source.id)));
      message.append(section);
    }
    if(result.coverage)message.append(createElement("p","message-note",result.coverage));
    scrollToLatest(message);
    if(connected&&result.navigationRequested&&result.answerStatus!=="clarification_needed"&&sources.length===1&&/^(?:take me there|open it|open that|show me that section)[.!?]*$/i.test(question.trim()))void open(sources[0]);
  }

  async function search(question, contextId) {
    const sequence = ++searchSequence;
    const sharedState=refreshSharedUi();
    const localSharedMode=Boolean(sharedState?.activeMode)||sharedRoutingLock;
    lastQuestion = question;
    lastQuestionPrivate=localSharedMode;
    addUserMessage(question,{sensitive:localSharedMode});
    const loading = addLoadingMessage();
    form.querySelector("button[type='submit']").disabled = true;
    input.disabled = true;
    chatPanel.focus({ preventScroll: true });

    try {
      if(localSharedMode){
        await Promise.resolve();
        if(sequence!==searchSequence)return{status:"cancelled",sources:[]};
        loading.remove();
        const result=sharedState?.activeMode?sharedStore.ask(question):{status:"expired",mode:null,privateLocal:true,answer:"Your shared information expired or was cleared. Start a new demo session or share an updated copy; this question was not sent to the public search.",sources:[]};
        renderSharedAnswer(result);
        return result;
      }
      const response = await api.fetch(`/api/search?q=${encodeURIComponent(question)}${contextId ? "&context=" + encodeURIComponent(contextId) : ""}`);
      const result = await api.readJson(response);
      if (sequence !== searchSequence) return { status:"cancelled", matches:[], links:[] };
      if (!response.ok) throw new Error(result.error || "Search is unavailable.");
      loading.remove();
      if (result.personal) renderPersonal(result,question);
      else if (result.indexed) renderIndexed(result, question);
      else if (result.status === "matched") renderAnswer(result.matches[0], result.links, result);
      else if (result.status === "choices") renderChoices(result.matches, result.links, result);
      else renderUnmatched(result.links, result.scopeNote);
      return result;
    } catch (error) {
      if (sequence !== searchSequence) return { status:"cancelled", matches:[], links:[] };
      loading.remove();
      addAssistantText(
        "The local knowledge search is temporarily unavailable.",
        error.message || "Please try again or create a support request."
      );
      return { status: "error", matches: [], links: [] };
    } finally {
      if (sequence === searchSequence) {
      form.querySelector("button[type='submit']").disabled = false;
      input.disabled = false;
      // A response arriving after minimization must not reopen the widget or
      // steal focus from the page or the support form.
      if (!chatPanel.hidden && !supportDialog.open && chatPanel.contains(document.activeElement)) {
        input.focus({ preventScroll: true });
      }
      }
    }
  }

  function submitQuestion(question, contextId = lastTopic) {
    if (input.disabled) return Promise.resolve({ status:"busy", matches:[], links:[] });
    const value = String(question || "").trim().slice(0, 500);
    if (!value) return Promise.resolve({ status: "unmatched", matches: [] });
    openChat();
    input.value = "";
    return search(value, contextId);
  }

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => submitQuestion(button.dataset.question, ""));
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(input.value);
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  clearButton?.addEventListener("click", () => {
    resetConversation();
    input.focus();
  });

  document.querySelector("#open-shared-information")?.addEventListener("click",()=>{
    refreshSharedUi();
    sharedDialog?.showModal();
  });
  document.querySelector("#close-shared-information")?.addEventListener("click",()=>sharedDialog?.close());
  sharedDialog?.addEventListener("cancel",()=>refreshSharedUi());
  sharedForm?.addEventListener("submit",event=>{
    event.preventDefault();
    const fields=new FormData(sharedForm);
    try{
      const added=sharedStore.add({category:fields.get("category"),title:fields.get("title"),term:fields.get("term"),sprint:fields.get("sprint"),text:fields.get("text")});
      sharedRoutingLock=false;
      sharedStatus.className="form-status success";
      sharedStatus.textContent=`${added.title} is available only in this temporary browser session for up to five minutes.`;
      sharedForm.elements.text.value="";
      sharedForm.elements.title.value="";
      resetConversation("Shared information is active. Ask only about the selected text you supplied; it is not a live portal connection.",{sensitive:true});
      refreshSharedUi();
      openChat();
    }catch(error){sharedStatus.className="form-status error";sharedStatus.textContent=error.message;}
  });
  document.querySelector("#load-sample-information")?.addEventListener("click",()=>{
    sharedStore.loadSample();sharedRoutingLock=false;
    resetConversation("Sample data — not your account. Ask about the fictional task, sprint, or component scores.",{sensitive:true});
    refreshSharedUi();openChat();
  });
  document.querySelector("#activate-shared-information")?.addEventListener("click",()=>{
    sharedStore.activate("shared");sharedRoutingLock=false;resetConversation("Your user-provided, unverified text is active again.",{sensitive:true});refreshSharedUi();
  });
  document.querySelector("#activate-sample-information")?.addEventListener("click",()=>{
    sharedStore.activate("sample");sharedRoutingLock=false;resetConversation("Sample data — not your account.",{sensitive:true});refreshSharedUi();
  });
  document.querySelector("#clear-shared-information")?.addEventListener("click",()=>{
    sharedStore.clearShared();sharedRoutingLock=false;resetConversation("Shared information and its dependent answers were cleared.",{sensitive:true});refreshSharedUi();
  });
  document.querySelector("#new-shared-session")?.addEventListener("click",()=>{
    sharedStore.newSession();sharedRoutingLock=false;resetConversation("A new demo session started. No shared or sample information is loaded.",{sensitive:true});refreshSharedUi();
  });
  document.addEventListener?.("visibilitychange",()=>{if(document.visibilityState==="visible")refreshSharedUi();});
  window.addEventListener?.("pageshow",()=>refreshSharedUi());
  window.addEventListener?.("focus",()=>refreshSharedUi());
  refreshSharedUi();

  supportDialog?.addEventListener("click", (event) => {
    if (event.target === supportDialog && !submittingTicket) supportDialog.close();
  });
  supportDialog?.addEventListener("cancel", (event) => {
    if (submittingTicket) event.preventDefault();
  });
  document.querySelectorAll(".dialog-close, [data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => supportDialog.close());
  });

  supportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (accountBusy || submittingTicket || !currentSession || currentSession.status === "sign-in-required") return;
    const formData = new FormData(supportForm);
    const transcript = conversation.map((item) => `${item.role}: ${item.text}`).join("\n");
    const payload = {
      // Connected identities come from the server, not these browser fields.
      name: currentSession.account ? undefined : formData.get("name"),
      email: currentSession.account ? undefined : formData.get("email"),
      identityContext: currentSession.identityContext,
      category: formData.get("category"),
      question: formData.get("question"),
      details: formData.get("details"),
      preferredContactMethod: formData.get("preferredContactMethod"),
      contactPhone: formData.get("preferredContactMethod") === "phone" ? formData.get("contactPhone") : undefined,
      includeTranscript: formData.has("includeTranscript"),
      privateToInstructor: formData.has("privateToInstructor"),
      transcript
    };
    try { contactPolicy.normalizeContact(payload, currentSession.account?.email || payload.email); }
    catch (error) {
      supportStatus.className = "form-status error";
      supportStatus.textContent = error.message;
      return;
    }

    submittingTicket = true;
    let created = false;
    updateAccountControls();
    supportStatus.className = "form-status";
    supportStatus.textContent = selectedAttachments.length ? "Reading documents and creating request…" : "Creating request…";
    try {
      const attachmentError = attachmentPolicy.validate(selectedAttachments);
      if (attachmentError) throw new Error(attachmentError);
      payload.attachments = await Promise.all(selectedAttachments.map(readAttachment));
      const response = await api.fetch("/api/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const ticket = await api.readJson(response);
      if (!response.ok) {
        if ([401, 409, 503].includes(response.status)) await loadAccount();
        throw new Error(ticket.error || "The request could not be created.");
      }
      if (!/^CAP-\d+$/.test(ticket.id)) throw new Error("No valid ticket receipt was returned. Check the queue before retrying.");
      created = true;
      supportStatus.className = "form-status success";
      supportStatus.textContent = api.storageMode === "browser" ? `${ticket.id} was saved in this browser only.` : api.storageMode === "supabase" ? `${ticket.id} was saved in the shared Supabase queue.` : `${ticket.id} was saved in this site's staff queue.`;
      addAssistantText(
        `Your support request ${ticket.id} has been created.`,
        api.storageMode === "browser" ? "Saved only in this browser's test queue, not on Ocelot. Teammates cannot see it on their devices. No email was sent." : api.storageMode === "supabase" ? "Saved in the shared Supabase test queue. Authorized staff can view it from another device. No email was sent." : "Saved on this app's server; no email was sent."
      );
      window.setTimeout(() => {
        supportDialog.close();
        supportForm.reset();
        contactFields.reset();
        selectedAttachments = [];
        attachmentStatus.textContent = "";
        renderAttachments();
        supportStatus.textContent = "";
        submittingTicket = false;
        updateAccountControls();
      }, 900);
    } catch (error) {
      supportStatus.className = "form-status error";
      supportStatus.textContent = error.message;
    } finally {
      if (!created) {
        submittingTicket = false;
        updateAccountControls();
      }
    }
  });

  function registerWebMcpTools() {
    if (window.CapstonePortal) return; // Do not expose private-source results to external agents.
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const controller = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "search_capstone_help",
      title: "Search Capstone help",
      description: "Search the same approved Capstone knowledge used by the visible assistant and show the result in the conversation.",
      inputSchema: {
        type: "object",
        properties: { question: { type: "string", minLength: 2, maxLength: 500 } },
        required: ["question"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(value) {
        const temporary=sharedStore?.status();
        if(temporary?.activeMode||sharedRoutingLock)throw new Error("Browser tools are unavailable while temporary shared information is loaded or awaiting clearance.");
        const question = String(value?.question || "").trim();
        if (question.length < 2) throw new Error("A question is required.");
        const result = await submitQuestion(question);
        return { status: result.status, matches: result.matches.map((match) => ({ title: match.title, url: match.url })), links: result.links || [] };
      }
    }, { signal: controller.signal })).catch(() => {});
  }

  registerWebMcpTools();
})();
