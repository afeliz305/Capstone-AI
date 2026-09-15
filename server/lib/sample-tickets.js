const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { STAFF } = require("./staff-auth");

// Fictional scenarios for exercising the local queue, not reports about FIU.
const resolvedScenarios = [
  ["template-download", "Scrum and sprints", "The sprint planning template download returns a missing-file page.", "The sample student can open Resources but cannot download the planning template.", "In this fictional scenario, the template link was pointed to the current document. The sample download was checked and the request was closed."],
  ["tutorial-link", "Website navigation", "The tutorial link opens a different tutorial than its label.", "The sample student selects the repository tutorial but reaches an unrelated video.", "The example tutorial link and label were matched, then the expected video destination was checked. No live site link was changed."],
  ["attendance-display", "Attendance", "A submitted attendance entry is not appearing in the portal view.", "A fictional attendance record is used to reproduce a stale display after submission; no real attendance record is involved.", "The simulated record was present, but the page was showing an outdated view. Refreshing the example list displayed the record; no real attendance was edited."],
  ["mobile-navigation", "Website navigation", "The Resources menu is clipped on a narrow phone screen.", "The sample user cannot reach the last navigation item in a small-screen test.", "The example navigation container was made scrollable at the narrow breakpoint. All sample menu entries were then reachable."],
  ["showcase-file", "Showcase", "The showcase poster preview displays an older version.", "A fictional project poster was replaced, but the example preview still shows the previous image.", "The simulated preview reference was refreshed to the latest file version and checked against the sample upload."],
  ["logo-asset", "Templates and branding", "The FIU logo preview is blank on the branding resources page.", "The fictional resource card displays a broken-image placeholder instead of its preview.", "The example asset path was corrected and an accessible text fallback was checked. No official branding asset was modified."],
  ["project-title", "Coursework", "My project card still shows the previous project title.", "The example project title changed, but its listing card has not caught up.", "The simulated listing was refreshed from the updated sample project record. The detail and listing titles now agree in the scenario."],
  ["search-terms", "Other", "Searching for daily standup does not show the expected Scrum resource.", "The fictional search case uses an alternate phrase for a resource already in the sample content.", "The example search mapping was checked with both daily standup and Daily Scrum. The scenario was closed after both returned the intended sample resource."],
  ["support-form-error", "Website navigation", "The support form error message is hidden below the submit button.", "The sample user submits an incomplete form on a short screen and does not notice the validation message.", "In the example fix, the error message was placed beside the field and focus moved to the invalid input. The retry completed with fictional data."],
  ["attendance-filter", "Attendance", "The attendance page keeps showing the wrong selected week.", "The sample user changes the week filter, but the fictional list continues to show the previous selection.", "The simulated filter state was updated when the selection changed. Example records from the requested week were then shown correctly."],
  ["session-return", "Website navigation", "After signing in, the portal returns me to the wrong resource page.", "The sample navigation flow loses the intended destination during sign-in.", "The example return destination was preserved as a same-site path, then the fictional sign-in flow was checked from the original resource link."],
  ["attachment-name", "Other", "A document with an accented filename downloads with an unreadable name.", "The sample support request uses a fictional résumé file to test document filename handling.", "The simulated download response used a UTF-8 filename. The example filename and original file contents were checked successfully."]
];
const openScenarios = [
  ["new-attendance", "Attendance", "The attendance summary total differs from the visible entries.", "Please investigate the count in this fictional attendance test. No real attendance changes are requested."],
  ["new-project-link", "Coursework", "The project details button opens a blank page.", "The fictional project card appears in the listing, but its details view is empty. Please reproduce and propose a fix."],
  ["new-video-controls", "Website navigation", "Tutorial video controls are hard to reach on a small screen.", "Please check the fictional video layout and whether keyboard users can reach all controls."],
  ["new-showcase-download", "Showcase", "The showcase checklist download never finishes.", "The sample student sees the download start but not complete. Please inspect the example link and response."],
  ["new-chat-layout", "Other", "A long source title overlaps the chat response on mobile.", "Please test the assistant with a long fictional source title and a narrow window, then document a resolution."]
];

function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function planSampleTickets(existing, { now = Date.now(), random = Math.random } = {}) {
  if (!Array.isArray(existing)) throw new Error("The ticket file must contain a list. Existing data was not changed.");
  const keys = new Set(existing.map((ticket) => ticket.sampleSeedKey));
  let highest = existing.reduce((maximum, ticket) => {
    const match = /^CAP-(\d+)$/.exec(String(ticket.id));
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 1000);
  const owners = shuffled(STAFF, random);
  const scenarios = [...shuffled(resolvedScenarios, random), ...shuffled(openScenarios, random)];
  const added = [];
  scenarios.forEach(([key, category, question, details, resolution], index) => {
    const sampleSeedKey = "support-scenarios-v1:" + key;
    if (keys.has(sampleSeedKey)) return;
    const resolved = Boolean(resolution);
    const age = resolved ? (3 + Math.floor(random() * 12)) * 86400000 : (10 + Math.floor(random() * 170)) * 60000;
    const createdAt = new Date(now - age).toISOString();
    const resolvedAt = resolved ? new Date(now - age + (2 + Math.floor(random() * 22)) * 3600000).toISOString() : null;
    const owner = resolved ? owners[index % owners.length] : null;
    added.push({
      id: "CAP-" + (++highest),
      name: "Sample Student " + String(index + 1).padStart(2, "0"),
      email: "sample.student." + String(index + 1).padStart(2, "0") + "@example.edu",
      accountId: null,
      identitySource: "sample-seed",
      category, question,
      details: "FICTIONAL TEST SCENARIO — not a report about the live FIU site. " + details,
      transcript: "",
      privateToInstructor: false,
      attachments: [],
      status: resolved ? "resolved" : "open",
      assignedTo: owner?.email || null,
      ...(owner ? { assignedBy: "sample-data-generator", assignedAt: createdAt } : {}),
      ...(resolved ? { resolution, resolvedBy: owner.email, resolvedAt, updatedAt: resolvedAt, updatedBy: "sample-data-generator" } : {}),
      isSample: true,
      sampleSeedKey,
      source: "Capstone AI Chat fictional sample data",
      createdAt
    });
  });
  added.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { tickets: [...added, ...existing], added };
}

async function seedSampleTickets(file, options = {}) {
  let raw;
  try { raw = await fs.readFile(file, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const existing = raw === undefined ? [] : JSON.parse(raw);
  const plan = planSampleTickets(existing, options);
  if (!plan.added.length) return { added: 0, resolved: 0, open: 0, total: existing.length, backup: null };
  await fs.mkdir(path.dirname(file), { recursive: true });
  const backup = raw === undefined ? null : file + ".seed-backup-" + randomUUID();
  if (backup) await fs.writeFile(backup, raw, { flag: "wx", mode: 0o600 });
  const temporary = file + ".seed-" + randomUUID() + ".tmp";
  try {
    await fs.writeFile(temporary, JSON.stringify(plan.tickets, null, 2), { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  } catch (error) {
    try { await fs.unlink(temporary); } catch (cleanupError) { if (cleanupError.code !== "ENOENT") throw cleanupError; }
    throw error;
  }
  return { added: plan.added.length, resolved: plan.added.filter((ticket) => ticket.status === "resolved").length, open: plan.added.filter((ticket) => ticket.status === "open").length, total: plan.tickets.length, backup };
}

module.exports = { planSampleTickets, seedSampleTickets };
