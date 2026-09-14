(() => {
  "use strict";

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
  const attachmentPolicy = window.CapstoneAttachmentPolicy;
  let selectedAttachments = [];
  const conversation = [];
  let lastQuestion = "";
  let currentSession = null;
  let accountBusy = false;
  let submittingTicket = false;
  let identityWasAccount = false;
  let accountRequest = 0;

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

  function scrollToLatest() {
    log.scrollTop = log.scrollHeight;
  }

  function addUserMessage(text) {
    const message = createElement("article", "message user-message");
    message.append(createElement("div", "message-label", "YOU"));
    message.append(createElement("p", "", text));
    log.append(message);
    conversation.push({ role: "User", text });
    scrollToLatest();
  }

  function addAssistantText(text, note) {
    const message = createElement("article", "message assistant-message");
    message.append(createElement("div", "message-label", "CAPSTONE ASSISTANT"));
    message.append(createElement("p", "", text));
    if (note) message.append(createElement("p", "message-note", note));
    log.append(message);
    conversation.push({ role: "Assistant", text });
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

  function addSourceCard(container, match) {
    const source = createElement("a", "source-card");
    source.href = match.url;
    source.target = "_blank";
    source.rel = "noreferrer";
    const label = createElement("span", "source-kicker", `${match.access === "authenticated" ? "SIGN-IN REQUIRED" : "CAPSTONE SOURCE"} · ${match.section}`);
    const title = createElement("strong", "", match.sourceTitle || match.title);
    const action = createElement("span", "source-action", "Open source ↗");
    source.append(label, title, action);
    container.append(source);
  }

  function createActionButton(label, className, action) {
    const button = createElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
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
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
      const session = await response.json();
      if (!response.ok) throw new Error(session.error || "Account details are unavailable.");
      if (requestNumber !== accountRequest) return;
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
      const response = await fetch("/api/demo-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
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
    const questionField = supportForm.elements.question;
    if (question && !questionField.value) questionField.value = question;
    supportStatus.textContent = "";
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

  function renderAnswer(match) {
    const message = addAssistantText(match.answer);
    addSourceCard(message, match);
    addFeedback(message);
  }

  function renderChoices(matches) {
    const message = addAssistantText(
      "I found a few related Capstone topics. Which one best matches what you need?",
      "Choosing a topic lets me use its reviewed answer instead of guessing."
    );
    const choices = createElement("div", "result-choices");
    matches.forEach((match) => {
      const button = createActionButton(match.title, "result-choice", () => {
        choices.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        renderAnswer(match);
      });
      const meta = createElement("span", "", `${match.section} · ${match.access === "authenticated" ? "sign-in required" : "public"}`);
      button.append(meta);
      choices.append(button);
    });
    message.append(choices);
  }

  function renderUnmatched() {
    const message = addAssistantText(
      "I couldn’t find that answer in the approved Capstone content.",
      "Try adding a detail such as “showcase,” “sprint,” “template,” or “tutorial.” If you still need help, create a support request."
    );
    const actions = createElement("div", "message-actions");
    actions.append(
      createActionButton("Try another question", "secondary-action", () => input.focus()),
      createActionButton("Create support request", "primary-action", () => openSupportDialog())
    );
    message.append(actions);
  }

  async function search(question) {
    lastQuestion = question;
    addUserMessage(question);
    const loading = addLoadingMessage();
    form.querySelector("button[type='submit']").disabled = true;
    input.disabled = true;
    chatPanel.focus({ preventScroll: true });

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(question)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Search is unavailable.");
      loading.remove();
      if (result.status === "matched") renderAnswer(result.matches[0]);
      else if (result.status === "choices") renderChoices(result.matches);
      else renderUnmatched();
      return result;
    } catch (error) {
      loading.remove();
      addAssistantText(
        "The local knowledge search is temporarily unavailable.",
        error.message || "Please try again or create a support request."
      );
      return { status: "error", matches: [] };
    } finally {
      form.querySelector("button[type='submit']").disabled = false;
      input.disabled = false;
      // A response arriving after minimization must not reopen the widget or
      // steal focus from the page or the support form.
      if (!chatPanel.hidden && !supportDialog.open && chatPanel.contains(document.activeElement)) {
        input.focus({ preventScroll: true });
      }
    }
  }

  function submitQuestion(question) {
    const value = String(question || "").trim();
    if (!value) return Promise.resolve({ status: "unmatched", matches: [] });
    openChat();
    input.value = "";
    return search(value);
  }

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => submitQuestion(button.dataset.question));
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
    const messages = log.querySelectorAll(".user-message, .assistant-message, .result-choices, .feedback-row");
    messages.forEach((message, index) => { if (index > 0) message.remove(); });
    conversation.length = 0;
    lastQuestion = "";
    input.value = "";
    input.focus();
  });

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
      includeTranscript: formData.has("includeTranscript"),
      privateToInstructor: formData.has("privateToInstructor"),
      transcript
    };

    submittingTicket = true;
    let created = false;
    updateAccountControls();
    supportStatus.className = "form-status";
    supportStatus.textContent = selectedAttachments.length ? "Reading documents and creating request…" : "Creating request…";
    try {
      const attachmentError = attachmentPolicy.validate(selectedAttachments);
      if (attachmentError) throw new Error(attachmentError);
      payload.attachments = await Promise.all(selectedAttachments.map(readAttachment));
      const response = await fetch("/api/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const ticket = await response.json();
      if (!response.ok) {
        if ([401, 409, 503].includes(response.status)) await loadAccount();
        throw new Error(ticket.error || "The request could not be created.");
      }
      created = true;
      supportStatus.className = "form-status success";
      supportStatus.textContent = `${ticket.id} was created in the local staff queue.`;
      addAssistantText(
        `Your support request ${ticket.id} has been created.`,
        "This prototype saved it locally; no email was sent."
      );
      window.setTimeout(() => {
        supportDialog.close();
        supportForm.reset();
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
        const question = String(value?.question || "").trim();
        if (question.length < 2) throw new Error("A question is required.");
        const result = await submitQuestion(question);
        return { status: result.status, matches: result.matches.map((match) => ({ title: match.title, url: match.url })) };
      }
    }, { signal: controller.signal })).catch(() => {});
  }

  registerWebMcpTools();
})();
