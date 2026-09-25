(() => {
  "use strict";
  const syllabus = window.CapstoneSyllabus;
  const toc = document.querySelector("#syllabus-topics");
  const content = document.querySelector("#syllabus-entries");
  for (const entry of syllabus.entries) {
    const link = document.createElement("a");
    link.href = "#" + entry.id; link.textContent = entry.title; toc.append(link);
    const section = document.createElement("section"); section.id = entry.id;
    const title = document.createElement("h2"); title.textContent = entry.title;
    const source = document.createElement("p"); source.className = "message-note";
    source.textContent = entry.sourceKind === "syllabus" ? "Original syllabus, pages " + entry.sourcePages + " · " + syllabus.course : "Prototype limitation, not a syllabus rule.";
    const text = document.createElement("p"); text.className = "syllabus-answer"; text.textContent = entry.answer;
    section.append(title, source, text); content.append(section);
  }
  const hash = window.location.hash.slice(1);
  if (syllabus.entries.some(entry => entry.id === hash)) document.getElementById(hash)?.scrollIntoView();
})();
