(() => {
  "use strict";

  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");
  const log = document.querySelector(".chat-log");
  const clearButton = document.querySelector(".chat-header .icon-button");
  const supportDialog = document.querySelector("#support-dialog");
  const supportForm = document.querySelector("#support-form");
  const supportStatus = document.querySelector("#support-status");
  const conversation = [];
  let lastQuestion = "";

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

  function openSupportDialog(question = lastQuestion) {
    const questionField = supportForm.elements.question;
    if (question && !questionField.value) questionField.value = question;
    supportStatus.textContent = "";
    supportDialog.showModal();
    supportForm.elements.name.focus();
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
      input.focus();
    }
  }

  function submitQuestion(question) {
    const value = String(question || "").trim();
    if (!value) return Promise.resolve({ status: "unmatched", matches: [] });
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
    if (event.target === supportDialog) supportDialog.close();
  });
  document.querySelectorAll(".dialog-close, [data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => supportDialog.close());
  });

  supportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = supportForm.querySelector("button[type='submit']");
    const formData = new FormData(supportForm);
    const transcript = conversation.map((item) => `${item.role}: ${item.text}`).join("\n");
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      category: formData.get("category"),
      question: formData.get("question"),
      details: formData.get("details"),
      includeTranscript: formData.has("includeTranscript"),
      privateToInstructor: formData.has("privateToInstructor"),
      transcript
    };

    submitButton.disabled = true;
    supportStatus.className = "form-status";
    supportStatus.textContent = "Creating request…";
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const ticket = await response.json();
      if (!response.ok) throw new Error(ticket.error || "The request could not be created.");
      supportStatus.className = "form-status success";
      supportStatus.textContent = `${ticket.id} was created in the local staff queue.`;
      addAssistantText(
        `Your support request ${ticket.id} has been created.`,
        "This prototype saved it locally; no email was sent."
      );
      window.setTimeout(() => {
        supportDialog.close();
        supportForm.reset();
        supportStatus.textContent = "";
      }, 900);
    } catch (error) {
      supportStatus.className = "form-status error";
      supportStatus.textContent = error.message;
    } finally {
      submitButton.disabled = false;
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
