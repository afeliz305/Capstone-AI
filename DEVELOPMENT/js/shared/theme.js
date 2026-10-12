(() => {
  "use strict";

  const key = "mira-theme-preference";
  const toggleChoices = ["system", "dark", "light"];
  const choices = ["system", "dark", "light", "portal"];
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  let portalTheme = null;

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
    if (value === "portal" && portalTheme) return portalTheme;
    return value === "system" || value === "portal" ? (media?.matches ? "dark" : "light") : value;
  }

  function updateButtons(value) {
    const resolved = resolvedTheme(value);
    const toggleValue = toggleChoices.includes(value) ? value : "system";
    const next = toggleChoices[(toggleChoices.indexOf(toggleValue) + 1) % toggleChoices.length];
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const label = button.querySelector("[data-theme-label]");
      button.dataset.themePreference = value;
      button.setAttribute("aria-label", `Theme: ${value}. Switch to ${next} mode.`);
      button.setAttribute("aria-pressed", String(resolved === "dark"));
      button.title = `Theme: ${value} (${resolved}). Switch to ${next}.`;
      if (label) label.textContent = value === "system" ? "Auto" : value === "portal" ? "Portal" : value[0].toUpperCase() + value.slice(1);
    });
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const selected = button.dataset.themeChoice === value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const note = document.querySelector?.("#portal-theme-note");
    if (note) note.textContent = portalTheme ? `Portal theme available: ${portalTheme}.` : "Portal theme unavailable; Follow portal uses Auto.";
  }

  function applyTheme(value, { persist = false } = {}) {
    const preference = choices.includes(value) ? value : "system";
    const resolved = resolvedTheme(preference);
    if (preference === "system" || (preference === "portal" && !portalTheme)) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    if (persist) writePreference(preference);
    updateButtons(preference);
    window.dispatchEvent(new CustomEvent("mira-theme-change", { detail: { preference, resolved, portalAvailable: Boolean(portalTheme) } }));
  }

  let preference = readPreference();
  applyTheme(preference);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-theme-toggle]");
    if (!button) return;
    const current = toggleChoices.includes(preference) ? preference : "system";
    preference = toggleChoices[(toggleChoices.indexOf(current) + 1) % toggleChoices.length];
    applyTheme(preference, { persist: true });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-theme-choice]");
    if (!button) return;
    preference = choices.includes(button.dataset.themeChoice) ? button.dataset.themeChoice : "system";
    applyTheme(preference, { persist: true });
  });

  window.addEventListener?.("mira-portal-theme", (event) => {
    const candidate = String(event.detail?.theme || "").toLowerCase();
    portalTheme = ["light", "dark"].includes(candidate) ? candidate : null;
    applyTheme(preference);
  });

  media?.addEventListener?.("change", () => {
    if (preference === "system" || (preference === "portal" && !portalTheme)) applyTheme(preference);
  });

  window.MiraTheme = Object.freeze({
    get preference() { return preference; },
    get resolved() { return resolvedTheme(preference); },
    get portalAvailable() { return Boolean(portalTheme); },
    setPortalTheme(value) { portalTheme = ["light", "dark"].includes(value) ? value : null; applyTheme(preference); },
    set(value) { preference = choices.includes(value) ? value : "system"; applyTheme(preference, { persist: true }); }
  });
})();
