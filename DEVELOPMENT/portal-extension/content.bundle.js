(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // server/portal-local/dom-reader.js
  var require_dom_reader = __commonJS({
    "server/portal-local/dom-reader.js"(exports, module) {
      var SECTION_ROUTES2 = { Today: "/today", Inbox: "/inbox", Board: "/board", Meetings: "/meetings", "My work": "/my-work", "Projects this term": "/this-term", People: "/people", "My rhythm": "/me/rhythm", Recognition: "/recognition", "Profile and privacy": "/me/privacy", "Start here": "orientation", Team: "team", Standing: "compare", Grade: "mygrade", Classmates: "netclass", "Alumni directory": "netdir", Connections: "netconn", Opportunities: "netopp", "Team contacts": "netteam", "AI Anchors": "aidir", Record: "caprecord", Showcase: "myshowcase", Letters: "myletters", "Request a letter": "reqletter", Resources: "resources", "Brand & templates": "brandhub" };
      var INTENTIONALLY_EXCLUDED = /* @__PURE__ */ new Set(["Classmates", "Alumni directory", "Projects this term", "Recognition", "Profile and privacy", "Grade"]);
      var canonicalSection2 = (section) => ({ Overview: "Today", Messages: "Inbox" })[section] || section;
      function readPortalGuard2() {
        const standalone = { "/today": "Today", "/inbox": "Inbox", "/board": "Board", "/meetings": "Meetings", "/my-work": "My work", "/this-term": "Projects this term", "/people": "People", "/me/rhythm": "My rhythm", "/recognition": "Recognition", "/me/privacy": "Profile and privacy" };
        if (location.origin !== "https://capstone.cs.fiu.edu" || location.search || !(location.pathname === "/portal" || Object.hasOwn(standalone, location.pathname))) return { state: "connection-lost" };
        const selected = document.querySelector("main .sidebar .nav-item.on"), active = standalone[location.pathname] || selected?.textContent?.trim() || null;
        return { state: "present", documentId: performance.timeOrigin, active, route: location.pathname === "/portal" ? selected?.getAttribute("data-v") || null : location.pathname, editable: !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]') };
      }
      function readPortalIdentity() {
        const standalone = /* @__PURE__ */ new Set(["/today", "/inbox", "/board", "/meetings", "/my-work", "/this-term", "/people", "/me/rhythm", "/recognition", "/me/privacy"]);
        if (location.origin !== "https://capstone.cs.fiu.edu" || location.search || !(location.pathname === "/portal" || standalone.has(location.pathname))) return { state: "connection-lost" };
        const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== "hidden";
        const navigation = performance.getEntriesByType("navigation")[0], proof = { documentId: performance.timeOrigin, status: navigation?.responseStatus, transferred: navigation?.transferSize, worker: navigation?.workerStart || 0, serviceWorker: !!navigator.serviceWorker?.controller };
        if (document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return { state: "editing-active", proof };
        const account = document.querySelector('button[aria-label="Your account"],button[aria-label="Account menu"]');
        if (!visible(account)) return { state: "sign-in-required", proof };
        const wasOpen = account.getAttribute("aria-expanded") === "true";
        if (!wasOpen) account.click();
        const menu = document.querySelector("#pubavdrop.open"), name = menu?.querySelector(".avdname")?.textContent?.trim(), email = menu?.querySelector(".avdemail")?.textContent?.trim();
        const identity = visible(menu) && menu?.querySelector('form[action="/logout"][method="post"]') && name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") ? { name: name.slice(0, 120), email: email.toLowerCase().slice(0, 254) } : null;
        if (!wasOpen) account.click();
        if (!identity) return { state: "sign-in-required", proof };
        const names = { "/today": "Today", "/inbox": "Inbox", "/board": "Board", "/meetings": "Meetings", "/my-work": "My work", "/this-term": "Projects this term", "/people": "People", "/me/rhythm": "My rhythm", "/recognition": "Recognition", "/me/privacy": "Profile and privacy" };
        return { state: "verified", identity, proof, active: names[location.pathname] || document.querySelector("main .sidebar .nav-item.on")?.textContent?.trim() || null };
      }
      async function navigatePortalSection2(section) {
        if (location.origin !== "https://capstone.cs.fiu.edu" || location.search) return { state: "connection-lost" };
        const wanted = { Overview: "Today", Messages: "Inbox" }[section] || section, routes = { Today: "/today", Inbox: "/inbox", Board: "/board", Meetings: "/meetings", "My work": "/my-work", "Projects this term": "/this-term", People: "/people", "My rhythm": "/me/rhythm", Recognition: "/recognition", "Profile and privacy": "/me/privacy", "Start here": "orientation", Team: "team", Standing: "compare", Grade: "mygrade", Classmates: "netclass", "Alumni directory": "netdir", Connections: "netconn", Opportunities: "netopp", "Team contacts": "netteam", "AI Anchors": "aidir", Record: "caprecord", Showcase: "myshowcase", Letters: "myletters", "Request a letter": "reqletter", Resources: "resources", "Brand & templates": "brandhub" };
        const route = routes[wanted];
        if (!route) return { state: "section-denied" };
        if (document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return { state: "editing-active" };
        if (route.startsWith("/")) return { state: location.pathname === route ? "present" : "route-required", active: location.pathname === route ? wanted : null, section: wanted, url: location.origin + route };
        if (location.pathname !== "/portal") return { state: "route-required", active: null, section: wanted, url: location.origin + "/portal#" + route };
        const button = document.querySelector('main .sidebar button.nav-item[data-v="' + route + '"]');
        if (!button || button.disabled) return { state: "section-unavailable" };
        if (!button.classList.contains("on")) button.click();
        let active = null;
        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          active = document.querySelector("main .sidebar .nav-item.on")?.textContent?.trim();
          if (active === wanted && document.querySelector("main #cmain")) break;
        }
        return { state: active === wanted ? "present" : "section-unavailable", active, section: wanted, url: location.origin + "/portal" };
      }
      function readPortalCapabilities2() {
        const routes = { Today: "/today", Inbox: "/inbox", Board: "/board", Meetings: "/meetings", "My work": "/my-work", "Projects this term": "/this-term", People: "/people", "My rhythm": "/me/rhythm", Recognition: "/recognition", "Profile and privacy": "/me/privacy", "Start here": "orientation", Team: "team", Standing: "compare", Grade: "mygrade", Classmates: "netclass", "Alumni directory": "netdir", Connections: "netconn", Opportunities: "netopp", "Team contacts": "netteam", "AI Anchors": "aidir", Record: "caprecord", Showcase: "myshowcase", Letters: "myletters", "Request a letter": "reqletter", Resources: "resources", "Brand & templates": "brandhub" };
        if (location.origin !== "https://capstone.cs.fiu.edu" || location.search) return { state: "connection-lost", sources: [] };
        const excluded = /* @__PURE__ */ new Set(["Classmates", "Alumni directory", "Projects this term", "Recognition", "Profile and privacy", "Grade"]), sources = [];
        for (const [section, route] of Object.entries(routes)) {
          const node = route.startsWith("/") ? [...document.querySelectorAll("a[href]")].find((link) => {
            try {
              return new URL(link.href, location.href).pathname === route;
            } catch {
              return false;
            }
          }) : document.querySelector('main .sidebar .nav-item[data-v="' + route + '"]'), current = route.startsWith("/") ? location.pathname === route : node?.classList.contains("on") || false, blocked = section === "Grade" ? "Grade values are intentionally excluded; navigation remains available." : excluded.has(section) ? "Unrelated directory/profile records are intentionally excluded." : null;
          sources.push({ section, route, discovered: !!node || current, accessible: (!!node || current) && !node?.disabled, inspected: false, extractionSupported: !excluded.has(section), currentlyLoaded: current, searchable: !excluded.has(section), navigation: route.startsWith("/") ? "exact-route" : "parent", blocked });
        }
        return { state: "present", sources };
      }
      function readPortalSection2(input) {
        const requested = typeof input === "string" ? input : input?.section, identityName = typeof input === "object" ? String(input.identityName || "").trim() : "", section = { Overview: "Today", Messages: "Inbox" }[requested] || requested, routeNames = { "/today": "Today", "/inbox": "Inbox", "/board": "Board", "/meetings": "Meetings", "/my-work": "My work", "/this-term": "Projects this term", "/people": "People", "/me/rhythm": "My rhythm", "/recognition": "Recognition", "/me/privacy": "Profile and privacy" }, legacy = { "Start here": "orientation", Team: "team", Standing: "compare", Grade: "mygrade", Classmates: "netclass", "Alumni directory": "netdir", Connections: "netconn", Opportunities: "netopp", "Team contacts": "netteam", "AI Anchors": "aidir", Record: "caprecord", Showcase: "myshowcase", Letters: "myletters", "Request a letter": "reqletter", Resources: "resources", "Brand & templates": "brandhub" };
        if (location.origin !== "https://capstone.cs.fiu.edu" || location.search || !(location.pathname === "/portal" || Object.hasOwn(routeNames, location.pathname))) return { state: "connection-lost" };
        if (!Object.values(routeNames).includes(section) && !Object.hasOwn(legacy, section)) return { state: "section-denied" };
        const active = routeNames[location.pathname] || document.querySelector("main .sidebar .nav-item.on")?.textContent?.trim();
        if (active !== section) return { state: "section-required", active, section };
        if (document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return { state: "editing-active", active, section };
        if (["Grade", "Recognition", "Profile and privacy", "Projects this term"].includes(section)) return { state: "verified", section, records: [], coverage: section === "Grade" ? "Grade is navigation-only in this connector. Grade values remain personal and intentionally excluded from extraction." : section === "Recognition" ? "Recognition is navigation-only because the page can expose teammate recognition and evaluation-related information." : section === "Profile and privacy" ? "Profile and privacy is navigation-only. Personal identifiers, contact details, account values, and settings are not extracted." : "Projects this term is navigation-only here. The current project is identified from the signed-in Today/Team context; unrelated teams are not indexed." };
        const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== "hidden", clean = (value) => String(value || "").replace(/[\u25be\u25b8]/g, "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim(), allowedPaths = /* @__PURE__ */ new Set(["/portal", "/today", "/inbox", "/board", "/meetings", "/my-work", "/this-term", "/people", "/me/rhythm", "/recognition", "/me/privacy", "/resources", "/projects", "/tutorials"]);
        const safeUrl = (value) => {
          try {
            const url = new URL(value, location.href);
            if (url.origin !== location.origin || url.username || url.password || url.search) return location.origin + location.pathname;
            if (allowedPaths.has(url.pathname) || url.pathname.startsWith("/static/templates/") || url.pathname.startsWith("/showcase/resources/")) return url.href;
            return location.origin + location.pathname;
          } catch {
            return location.origin + location.pathname;
          }
        };
        const safeText = (root) => {
          const parts = [];
          const visit = (node) => {
            if (node.nodeType === 3) {
              const value = clean(node.textContent);
              if (value) parts.push(value);
              return;
            }
            if (node.nodeType !== 1 || !visible(node)) return;
            if (node.matches('script,style,noscript,form,input,textarea,select,option,button,[contenteditable="true"],.sb-card-edit,[class*="sb-e-"],#csMsgs,#csThread,#csComposeWrap,#csTyping')) return;
            if (node.matches("a") && /(?:pwd|passcode|token|secret|key)=/i.test(node.getAttribute("href") || "")) return;
            for (const child of node.childNodes) visit(child);
          };
          visit(root);
          return clean(parts.join("\n")).slice(0, 6e3);
        }, timestamp = (text) => clean(text).match(/(?:updated|posted|as of|synced)[^\n]{0,100}/i)?.[0]?.slice(0, 120) || null, records = [];
        const add = (kind, heading, text, subview, sourceTimestamp = null, coverage = "", sourceUrl = location.href) => {
          const value = clean(text);
          if (!value || /\bLoading(?:\u2026|\.\.\.)?\s*$/i.test(value)) return;
          records.push({ kind, heading: clean(heading).slice(0, 180), text: value.slice(0, 6e3), url: safeUrl(sourceUrl), section, subview: clean(subview || section).slice(0, 120), sourceTimestamp: sourceTimestamp || timestamp(value), coverage });
        };
        const content = location.pathname === "/portal" ? document.querySelector("main #cmain") : document.querySelector("main") || document.body;
        if (!content) return { state: "extraction-failed", section, records: [], coverage: "The expected section container was unavailable; no empty-state conclusion was made." };
        const extractBoard = () => {
          const firstName = identityName.split(/\s+/)[0]?.toLowerCase(), lastName = identityName.split(/\s+/).at(-1)?.toLowerCase();
          const belongsToCurrentUser = (card) => {
            if (!identityName) return true;
            const text = clean(card.textContent).toLowerCase();
            return firstName && new RegExp("\\b" + firstName.replace(/[^a-z0-9]/g, "") + "\\b").test(text) || lastName && lastName !== firstName && new RegExp("\\b" + lastName.replace(/[^a-z0-9]/g, "") + "\\b").test(text);
          };
          const seen = /* @__PURE__ */ new Set(), columns = [...content.querySelectorAll("#bcols .col[data-col],.sb-col")].slice(0, 12);
          for (const column of columns) {
            const heading = clean(column.getAttribute("aria-label") || column.querySelector("h2,h3,h4,.sb-col-title,.ch")?.textContent) || "Sprint board column";
            const cards = [...column.querySelectorAll(".kc[data-card],.sb-card[data-card-id][data-column-key],.sb-card-view")].filter(belongsToCurrentUser).slice(0, 40);
            for (const card of cards) {
              seen.add(card);
              const title = clean(card.getAttribute("aria-label") || card.querySelector(".sb-card-title,h3,h4,[data-card-title],.kt")?.textContent) || "Sprint task";
              add("task", title, safeText(card), heading, null, "Visible read-only card ID, title, lane/status, owner, size, blocked state, badges, criteria count, and evidence-presence metadata for the verified user only. Workflow controls, drafts, and unrelated cards are excluded.", location.href);
            }
          }
          for (const card of [...content.querySelectorAll(".sb-card[data-card-id][data-column-key]")].filter((card2) => !seen.has(card2) && belongsToCurrentUser(card2)).slice(0, 40)) {
            const title = clean(card.querySelector(".sb-card-title,h3,h4,[data-card-title]")?.textContent) || "Sprint task";
            add("task", title, safeText(card), "Current work", null, "Visible read-only card metadata for the verified user only; controls and drafts are excluded.");
          }
        };
        const extractStandups = () => {
          const roots = [...content.querySelectorAll('.sb-standup-form,[class*="standup"]')].filter((node, index, all) => visible(node) && !all.some((other, otherIndex) => otherIndex < index && other.contains(node))).slice(0, 20);
          for (const root of roots) {
            const labels = [...root.querySelectorAll("h2,h3,h4,label,[aria-label],.status,.badge,.pill")].filter(visible).map((node) => clean(node.getAttribute("aria-label") || node.textContent)).filter(Boolean);
            if (labels.length) add("standup", labels[0] || "Stand-up information", labels.join("\n"), "Stand-up", null, "Prompt labels and displayed submitted/pending status only. Unsaved input values and submit controls are excluded.");
          }
        };
        const extractCeremonies = () => {
          for (const panel of [...content.querySelectorAll('[id^="sb-ceremony-"],.cpanel')].filter(visible).slice(0, 30)) add("ceremony", clean(panel.querySelector("h2,h3,h4")?.textContent) || "Sprint ceremony", safeText(panel), "Sprint ceremonies");
          for (const table of [...content.querySelectorAll("table")].filter(visible).slice(0, 12)) add("schedule", clean(table.querySelector("caption")?.textContent) || "Schedule or deadline table", safeText(table), "Schedule");
        };
        if (section === "Today") {
          const project = document.querySelector('[data-ob-project][role="link"],h5[data-ob-project]'), crumb = content.querySelector(".crumb"), sub = project?.nextElementSibling;
          if (project) add("project", clean(project.textContent) || "Current project", [clean(crumb?.textContent), clean(project.textContent), clean(sub?.textContent)].filter(Boolean).join("\n"), "Today", null, "Current project, term/sprint label, and safe role labels visible to the signed-in user.", location.href);
          const todayCards = [...content.querySelectorAll(".card,.hero")].filter(visible).slice(0, 20), before = records.length;
          for (const card of todayCards) {
            const heading = clean(card.querySelector("h1,h2,h3,h4,h5,h6")?.textContent), text = safeText(card);
            if (!text || !(/your cards/i.test(heading) || /standups|office hours|sprint \d/i.test(text) && !/board\s*·/i.test(text))) continue;
            const kind = /your cards|task|in progress/i.test(heading + " " + text) ? "task" : /stand ?up/i.test(text) ? "standup" : /date|due|office hours/i.test(text) ? "dates" : "sprint";
            add(kind, heading || "Today", text, "Today", null, "Current sprint, personal next-step labels, own card summary, and safe ceremony/deadline information. Team-board previews, controls, and drafts are excluded.");
          }
          if (records.length === before && todayCards.length === 1) {
            const card = todayCards[0], heading = clean(card.querySelector("h1,h2,h3,h4,h5,h6")?.textContent) || "Today";
            add("profile", heading, safeText(card), "Today", null, "Single visible Today summary fixture; controls and form values are excluded.");
          }
        }
        if (section === "Board") {
          extractBoard();
          extractStandups();
          extractCeremonies();
        }
        if (section === "My work") {
          const page = clean((document.querySelector("#tdpage") || content).innerText), current = page.match(/Sprint\s+\d+\s+·[^\n]*(?:\n[^\n]*){0,5}\nIn progress\nOpen/i)?.[0];
          if (current) add("assignment", "Current sprint work", current, "My work", null, "Current signed-in sprint status, filing state, stand-up count, and safe due-date metadata. Earlier grade values and unrelated records are excluded.");
          const showcase = page.match(/Showcase\s+·[^\n]*(?:\n[^\n]*){0,2}\nComing/i)?.[0];
          if (showcase) add("dates", "Upcoming showcase", showcase, "My work");
        }
        if (section === "Meetings") for (const card of [...content.querySelectorAll(".mt-s,.card,.panel,.cpanel,.hero")].filter(visible).slice(0, 60)) {
          const heading = clean(card.querySelector("h1,h2,h3,h4,.mt-h,.mt-h4")?.textContent) || "Meeting information", text = safeText(card);
          if (!text || /calendar feed|private link|connect my calendar|my hours/i.test(heading + " " + text)) continue;
          if (!/up next|meeting|office hours|recurring|product owner|ceremon/i.test(heading + " " + text)) continue;
          add(/review|retro|ceremony/i.test(heading) ? "ceremony" : "schedule", heading, text, "Meetings", null, "Visible meeting title, date/time, status, type, and safe location/navigation labels only. Private meeting content, private notes, secret meeting URLs, availability controls, and calendar-feed secrets are excluded.");
        }
        if (section === "Inbox") for (const channel of [...content.querySelectorAll(".ibc,#csSide .cs-chan")].filter(visible).slice(0, 60)) {
          const name = clean(channel.getAttribute("aria-label") || channel.getAttribute("data-channel-name") || channel.querySelector(".cs-name,.name,.label,.title,[data-channel-name]")?.textContent || [...channel.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(" ")).slice(0, 180);
          if (!name) continue;
          const unread = channel.classList.contains("un") || channel.classList.contains("unread"), count = clean(channel.querySelector(".cs-count,.count,.badge")?.textContent);
          add("messages", name, "Channel: " + name + "\nUnread: " + (count || (unread ? "yes" : "no")), "Inbox metadata", null, "Channel metadata and unread indicators only. Message bodies, threads, composers, and read-state controls are excluded.");
        }
        if (section === "Team") {
          const root = content.querySelector(".myteam") || content, hero = root.querySelector(".myteam-hero");
          if (hero) add("team", "My team", safeText(hero), "Team summary");
          for (const row of [...root.querySelectorAll(".myteam-row")].slice(0, 30)) add("team-member", "Team member", safeText(row), "Team members");
          for (const card of [...root.querySelectorAll(".card")].filter(visible).slice(0, 20)) {
            const heading = clean(card.querySelector("h2,h3,h4")?.textContent) || "Team details";
            add(/product owner/i.test(heading) ? "product-owner" : /lead/i.test(heading) ? "leadership" : "team", heading, safeText(card), "Team details");
          }
          extractBoard();
          extractStandups();
          extractCeremonies();
        }
        if (section === "People") for (const card of [...content.querySelectorAll(".card,.hero,#tdpage > section")].filter(visible).slice(0, 30)) {
          const heading = clean(card.querySelector("h1,h2,h3,h4")?.textContent) || "People", text = safeText(card);
          if (!text || !/product owner|team leader|your team|office hours|ai anchor/i.test(heading + " " + text) || /classmates|alumni|browse/i.test(heading + " " + text)) continue;
          add(/product owner/i.test(text) ? "product-owner" : /team leader/i.test(text) ? "leadership" : "team", heading, text, "People", null, "Only the signed-in user\u2019s visible team/support relationships and role labels. Broad directories and unrelated students are excluded.");
        }
        if (section === "Standing") for (const card of [...content.querySelectorAll(":scope > .card,.card")].filter(visible).slice(0, 10)) add(card.querySelector(".trend") ? "standing-trend" : "standing", clean(card.querySelector("h2,h3")?.textContent) || "My standing", safeText(card), "Standing");
        if (section === "My rhythm") {
          const standups = content.querySelector('[aria-label^="Standups per week:"]'), moved = content.querySelector('[aria-label^="Cards moved per week:"]'), summary = [...content.querySelectorAll("p,div")].find((node) => /^This week:\s*\d+ standup/i.test(clean(node.textContent))), next = [...content.querySelectorAll(".card")].find((node) => /One next step:/i.test(clean(node.textContent)));
          const text = [standups?.getAttribute("aria-label"), moved?.getAttribute("aria-label"), clean(summary?.textContent), clean(next?.textContent)].filter(Boolean).join("\n");
          if (text) add("schedule", "My rhythm", text, "My rhythm", null, "Only the verified user\u2019s visible stand-up/card-movement counts, weekly history, current next-step label, and deadline. Class comparisons, names, ranks, grades, and performance judgments are excluded.");
        }
        if (section === "Start here") for (const card of [...content.querySelectorAll(".card")].filter(visible).slice(0, 20)) add("onboarding", clean(card.querySelector("h2,h3,h4")?.textContent) || "Start here", safeText(card), "Onboarding");
        if (["Connections", "Opportunities", "Team contacts", "AI Anchors", "Record", "Showcase", "Letters", "Request a letter", "Resources", "Brand & templates"].includes(section)) {
          const kinds = { Connections: "connection", Opportunities: "opportunity", "Team contacts": "team-contact", "AI Anchors": "ai-anchor", Record: "record", Showcase: "showcase", Letters: "letter", "Request a letter": "letter-guidance", Resources: "resource", "Brand & templates": "brand" };
          for (const card of [...content.querySelectorAll(".card,.panel,.hero")].filter(visible).slice(0, 40)) add(kinds[section], clean(card.querySelector("h1,h2,h3,h4")?.textContent) || section, safeText(card), section);
        }
        const limits = { Today: "Current sprint/project labels, personal next steps, own card summary, and safe ceremony/deadline information. Controls, drafts, grades, and unrelated team cards are excluded.", Board: "Visible card metadata for the verified user only: ID, title, lane/status, owner, size, blocked state, badges, criteria count, and evidence-presence status. No workflow control is activated.", "My work": "Current signed-in sprint work and due-state metadata only. Earlier grade values are excluded.", "My rhythm": "Only the signed-in user\u2019s visible rhythm counts/history and current next step. No class rank or performance judgment is inferred.", Meetings: "Visible meeting title, date/time, status, type, and safe location labels. Private content, URLs, notes, availability controls, and calendar-feed secrets are excluded.", Inbox: "Conversation/channel metadata and unread indicators only. No conversation is opened and no message body is read.", People: "Only safe current team/support role relationships; broad directories and unrelated students are excluded.", Team: "The signed-in account's own Team view and visible read-only board summary. Unrelated teams and workflow controls are excluded.", Standing: "Visible signed-in standing and trend information only; it remains session-scoped and is never added to shared knowledge." };
        return { state: "verified", section, records: records.slice(0, 240), coverage: limits[section] || "Visible read-only content from the selected approved portal section." };
      }
      var readPortalDom = readPortalSection2;
      module.exports = { SECTION_ROUTES: SECTION_ROUTES2, INTENTIONALLY_EXCLUDED, canonicalSection: canonicalSection2, readPortalDom, readPortalGuard: readPortalGuard2, readPortalIdentity, readPortalCapabilities: readPortalCapabilities2, navigatePortalSection: navigatePortalSection2, readPortalSection: readPortalSection2 };
    }
  });

  // portal-extension/content-entry.js
  var { SECTION_ROUTES, canonicalSection, readPortalGuard, readPortalCapabilities, navigatePortalSection, readPortalSection } = require_dom_reader();
  var PORTAL_PATHS = /* @__PURE__ */ new Set(["/portal", "/today", "/inbox", "/board", "/meetings", "/my-work", "/this-term", "/people", "/me/rhythm", "/recognition", "/me/privacy"]);
  var documentId = crypto.randomUUID();
  var exactPortal = () => location.origin === "https://capstone.cs.fiu.edu" && PORTAL_PATHS.has(location.pathname) && !location.search;
  var editing = () => !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
  async function freshIdentity() {
    if (!exactPortal()) return { state: "connection-lost" };
    if (editing()) return { state: "editing-active" };
    let response, text;
    const page = location.origin + location.pathname;
    try {
      response = await fetch(page, { method: "GET", credentials: "same-origin", cache: "no-store", redirect: "follow", headers: { Accept: "text/html" } });
      text = await response.text();
    } catch {
      return { state: "sign-in-required" };
    }
    if (!response.ok || response.url !== page || !text) return { state: "sign-in-required" };
    const parsed = new DOMParser().parseFromString(text, "text/html"), name = parsed.querySelector("#pubavdrop .avdname")?.textContent?.trim(), email = parsed.querySelector("#pubavdrop .avdemail")?.textContent?.trim(), logout = parsed.querySelector('#pubavdrop form[action="/logout"][method="post"]');
    if (!name || !logout || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) return { state: "sign-in-required" };
    return { state: "verified", identity: { name: name.slice(0, 120), email: email.toLowerCase().slice(0, 254) }, active: readPortalGuard().active, documentId, proof: { network: true, status: response.status, checkedAt: (/* @__PURE__ */ new Date()).toISOString(), bytes: text.length } };
  }
  async function combinedSection(payload, activeOnly = false) {
    const identity = await freshIdentity();
    if (identity.state !== "verified") return identity;
    const section = canonicalSection(activeOnly ? readPortalGuard().active : payload.section);
    if (!Object.hasOwn(SECTION_ROUTES, section)) return { state: "section-denied" };
    if (readPortalGuard().active !== section) {
      if (!payload.navigate) return { state: "section-required", section, message: "The requested section is not currently loaded." };
      const moved = await navigatePortalSection(section);
      if (moved.state !== "present") return moved;
    }
    const extracted = readPortalSection({ section, identityName: identity.identity.name });
    return { ...identity, ...extracted, identity: identity.identity, proof: identity.proof, documentId };
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.channel !== "mira-portal" || typeof message.operation !== "string") return false;
    void (async () => {
      try {
        let result;
        if (message.operation === "guard") result = { ...readPortalGuard(), documentId };
        else if (message.operation === "identity") result = await freshIdentity();
        else if (message.operation === "capabilities") result = { ...readPortalCapabilities(), documentId };
        else if (message.operation === "section") result = await combinedSection(message.payload || {});
        else if (message.operation === "active") result = await combinedSection({ ...message.payload, navigate: false }, true);
        else if (message.operation === "open") {
          const section = canonicalSection(message.payload?.section);
          if (!Object.hasOwn(SECTION_ROUTES, section)) result = { state: "section-denied" };
          else {
            const moved = await navigatePortalSection(section);
            result = { ...moved, guidance: section === "Inbox" ? "Open Inbox yourself; MIRA reads metadata only and will not open a conversation or change read state." : "The verified parent section is open. Open a nested detail manually when no stable deep link exists." };
          }
        } else result = { state: "operation-denied" };
        sendResponse({ ok: true, value: result });
      } catch {
        sendResponse({ ok: false, error: { state: "extension-operation-failed", message: "The approved portal read could not be completed." } });
      }
    })();
    return true;
  });
})();
