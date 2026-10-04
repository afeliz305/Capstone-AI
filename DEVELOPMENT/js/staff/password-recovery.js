(() => {
  "use strict";
  const api = window.CapstoneApi;
  const form = document.querySelector("#recovery-form");
  const fields = document.querySelector("#recovery-fields");
  const status = document.querySelector("#recovery-status");
  const save = document.querySelector("#save-recovery-password");
  const success = document.querySelector("#recovery-success");
  const controls = [
    ["recovery-new-password", "new password"],
    ["recovery-confirm-password", "confirmed password"]
  ].map(([id, label]) => ({ input:document.querySelector("#" + id), button:document.querySelector("#toggle-" + id), label }));
  let updating = false;

  function setVisibility(control, visible) {
    control.input.type = visible ? "text" : "password";
    control.button.textContent = visible ? "Hide" : "Show";
    control.button.setAttribute("aria-label", (visible ? "Hide " : "Show ") + control.label);
    control.button.setAttribute("aria-pressed", String(visible));
  }
  function clearPasswords() {
    controls.forEach(control => { control.input.value = ""; setVisibility(control, false); });
  }
  controls.forEach(control => {
    setVisibility(control, false);
    control.button.addEventListener("click", () => {
      if (!control.input.disabled) setVisibility(control, control.input.type === "password");
    });
  });
  window.addEventListener("pagehide", clearPasswords);

  async function initialize() {
    if (api.storageMode !== "supabase") {
      status.textContent = "Password recovery is available only from the hosted Supabase MIRA Staff Queue.";
      return;
    }
    try {
      const response = await api.fetch("/api/staff/password/recovery-session", { cache:"no-store" });
      const data = await api.readJson(response);
      if (!response.ok || data.ready !== true) throw new Error(data.error || "This recovery link is invalid or has expired.");
      // Remove recovery credentials from the visible URL as soon as the SDK has consumed them.
      if (window.location.hash || window.location.search) window.history.replaceState(null, "", window.location.pathname);
      status.textContent = "Recovery link verified. Enter a new MIRA staff password.";
      form.hidden = false;
      controls[0].input.focus();
    } catch (error) {
      clearPasswords();
      status.textContent = error.message;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (updating || !form.reportValidity()) return;
    const payload = { newPassword:controls[0].input.value, confirmPassword:controls[1].input.value };
    if (payload.newPassword !== payload.confirmPassword) {
      status.textContent = "The new passwords do not match.";
      controls[1].input.focus();
      return;
    }
    updating = true;
    fields.disabled = save.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.textContent = "Updating your MIRA staff password…";
    clearPasswords();
    try {
      const response = await api.fetch("/api/staff/password/recover", {
        method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(payload)
      });
      const data = await api.readJson(response);
      if (!response.ok || data.ok !== true) throw new Error(data.error || "The password update could not be confirmed.");
      form.hidden = true;
      status.textContent = "";
      success.hidden = false;
      document.querySelector("#return-to-staff").focus();
    } catch (error) {
      status.textContent = error.message;
      fields.disabled = save.disabled = false;
      controls[0].input.focus();
    } finally {
      payload.newPassword = payload.confirmPassword = "";
      clearPasswords();
      updating = false;
      form.setAttribute("aria-busy", "false");
    }
  });

  void initialize();
})();
