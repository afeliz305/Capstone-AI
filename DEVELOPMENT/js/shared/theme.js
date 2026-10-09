(() => {
  "use strict";

  const key = "mira-theme-preference";
  const choices = ["system", "dark", "light"];
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");

  function readPreference() {
    try {
      const saved = window.localStorage.getItem(key);
      return choices.includes(saved) ? saved : "system";
    } catch {
      return "system";
    }
  }

  function writePreference(value) {
    try {
      if (value === "system") window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Theme selection still works for this page when storage is blocked.
    }
  }

  function resolvedTheme(value) {
    return value === "system" ? (media?.matches ? "dark" : "light") : value;
  }

  function updateButtons(value) {
    const resolved = resolvedTheme(value);
    const next = choices[(choices.indexOf(value) + 1) % choices.length];
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const label = button.querySelector("[data-theme-label]");
      button.dataset.themePreference = value;
      button.setAttribute("aria-label", `Theme: ${value}. Switch to ${next} mode.`);
      button.setAttribute("aria-pressed", String(resolved === "dark"));
      button.title = `Theme: ${value} (${resolved}). Switch to ${next}.`;
      if (label) label.textContent = value[0].toUpperCase() + value.slice(1);
    });
  }

  function applyTheme(value, { persist = false } = {}) {
    const preference = choices.includes(value) ? value : "system";
    if (preference === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme = resolvedTheme(preference);
    if (persist) writePreference(preference);
    updateButtons(preference);
    window.dispatchEvent(new CustomEvent("mira-theme-change", { detail: { preference, resolved: resolvedTheme(preference) } }));
  }

  let preference = readPreference();
  applyTheme(preference);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-theme-toggle]");
    if (!button) return;
    preference = choices[(choices.indexOf(preference) + 1) % choices.length];
    applyTheme(preference, { persist: true });
  });

  media?.addEventListener?.("change", () => {
    if (preference === "system") applyTheme(preference);
  });

  window.MiraTheme = Object.freeze({
    get preference() { return preference; },
    get resolved() { return resolvedTheme(preference); },
    set(value) { preference = choices.includes(value) ? value : "system"; applyTheme(preference, { persist: true }); }
  });
})();
